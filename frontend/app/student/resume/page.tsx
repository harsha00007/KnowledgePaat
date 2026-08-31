"use client";

import React, { useState, useEffect, useRef } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { UpgradeModal } from '@/components/UpgradeModal';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  Trash2, 
  Eye, 
  AlertCircle, 
  FileCheck, 
  Calendar, 
  ShieldCheck,
  Download,
  Lock,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { calculateUserAccess, UserAccess } from '@/lib/subscription';
import { canStudentAccessResource, getStudentPurchasedResourceIds } from '@/lib/store';
import { PLANS, normalizePlanId } from '@/config/plans';

type ResumeData = {
  url: string | null;
  filename: string | null;
  uploadedAt: string | null;
};

export type ResumeTemplate = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  thumbnail_url: string | null;
  minimum_plan: string;
  price: number;
  is_free: boolean;
  is_active: boolean;
  download_count?: number;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export default function ResumePage() {
  const { isModuleEnabled } = useFeatureFlags();
  const isResumeEnabled = isModuleEnabled('student_resume');

  const [resume, setResume] = useState<ResumeData>({ url: null, filename: null, uploadedAt: null });
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userAccess, setUserAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());

  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState<string>('starter');
  const [upgradeFeatureTitle, setUpgradeFeatureTitle] = useState<string>('this resume template');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isResumeEnabled) {
      fetchResumeAndUserData();
      fetchTemplates();
    } else {
      setIsFetching(false);
    }
  }, [isResumeEnabled]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchResumeAndUserData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: profile, error: profileError },
        { data: subscriptionData },
        ownedIds
      ] = await Promise.all([
        supabase.from('profiles').select('resume_url, resume_filename, resume_uploaded_at').eq('id', user.id).single(),
        supabase.from('subscriptions').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        getStudentPurchasedResourceIds(supabase, user.id)
      ]);

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profile && profile.resume_url) {
        setResume({
          url: profile.resume_url,
          filename: profile.resume_filename,
          uploadedAt: profile.resume_uploaded_at,
        });
      } else {
        setResume({ url: null, filename: null, uploadedAt: null });
      }

      setUserAccess(calculateUserAccess(subscriptionData));
      setOwnedProductIds(ownedIds);
    } catch (err: any) {
      console.error("Error fetching resume and user data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchTemplates = async () => {
    setIsFetchingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('resume_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error && error.code !== '42P01') {
        throw error;
      }

      if (data && data.length > 0) {
        setTemplates(data as ResumeTemplate[]);
      } else {
        // Fallback default templates if database table is initializing
        setTemplates([
          {
            id: 'tmpl-1',
            title: 'Software Developer Fresher Resume',
            description: 'Clean, single-column ATS-friendly LaTeX and Word layout tailored for Software Engineer & Full Stack roles.',
            category: 'Software Development',
            file_url: '/sample_templates/software_engineer_fresher.pdf',
            thumbnail_url: null,
            minimum_plan: 'free',
            price: 0,
            is_free: true,
            is_active: true
          },
          {
            id: 'tmpl-2',
            title: 'Data Analyst & BI Specialist Resume',
            description: 'Structured layout emphasizing SQL, Python, Tableau, and analytics project outcomes.',
            category: 'Data & Analytics',
            file_url: '/sample_templates/data_analyst_resume.pdf',
            thumbnail_url: null,
            minimum_plan: 'starter',
            price: 49,
            is_free: false,
            is_active: true
          },
          {
            id: 'tmpl-3',
            title: 'Product & Business Analyst Resume',
            description: 'Metrics-driven layout highlighting agile delivery, sprint management, and data-backed user stories.',
            category: 'Product & Operations',
            file_url: '/sample_templates/business_analyst_resume.pdf',
            thumbnail_url: null,
            minimum_plan: 'starter',
            price: 49,
            is_free: false,
            is_active: true
          },
          {
            id: 'tmpl-4',
            title: 'Frontend React & UI/UX Developer Resume',
            description: 'Portfolio-focused format highlighting component architecture, web performance, and modern design systems.',
            category: 'Software Development',
            file_url: '/sample_templates/frontend_developer_resume.pdf',
            thumbnail_url: null,
            minimum_plan: 'pro',
            price: 79,
            is_free: false,
            is_active: true
          },
          {
            id: 'tmpl-5',
            title: 'HR & Talent Acquisition Executive Resume',
            description: 'Professional standard highlighting campus hiring, onboarding pipelines, and employee relations.',
            category: 'Human Resources',
            file_url: '/sample_templates/hr_executive_resume.pdf',
            thumbnail_url: null,
            minimum_plan: 'starter',
            price: 49,
            is_free: false,
            is_active: true
          }
        ]);
      }
    } catch (err) {
      console.error("Error fetching resume templates:", err);
    } finally {
      setIsFetchingTemplates(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      return "Invalid file type. Only PDF, DOC, and DOCX files are allowed.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum allowed size is 5 MB.";
    }
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    await processFile(file);
  };

  const processFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/resume_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('resumes')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          resume_url: uploadData.path,
          resume_filename: file.name,
          resume_uploaded_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      await fetchResumeAndUserData();
      showSuccess("Resume uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError("Failed to upload resume. Please check storage permissions and try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your resume?")) return;
    
    setIsUploading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !resume.url) return;

      const { error: deleteError } = await supabase
        .storage
        .from('resumes')
        .remove([resume.url]);

      if (deleteError) {
        console.error("Storage delete error:", deleteError);
        throw new Error("Failed to delete resume file. Please try again.");
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          resume_url: null,
          resume_filename: null,
          resume_uploaded_at: null,
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setResume({ url: null, filename: null, uploadedAt: null });
      showSuccess("Resume deleted successfully.");
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete resume. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async () => {
    if (!resume.url) return;
    try {
      const { data, error } = await supabase
        .storage
        .from('resumes')
        .createSignedUrl(resume.url, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      console.error("Error viewing resume:", err);
      setError("Failed to generate view link.");
    }
  };

  const handleDownloadTemplate = async (template: ResumeTemplate) => {
    const isAccessible = template.is_free || canStudentAccessResource(template.minimum_plan, userAccess, ownedProductIds, template.id);
    
    if (!isAccessible) {
      setModalRequiredPlan(template.minimum_plan || 'starter');
      setUpgradeFeatureTitle(template.title);
      setIsUpgradeModalOpen(true);
      return;
    }

    if (template.file_url.startsWith('http') || template.file_url.startsWith('/')) {
      window.open(template.file_url, '_blank');
    } else {
      try {
        const bucket = template.file_url.startsWith('notes/') ? 'notes' : 'resumes';
        const cleanPath = template.file_url.replace(/^(resumes\/|notes\/)/, '');
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 60);
        if (error || !data?.signedUrl) {
          window.open(template.file_url, '_blank');
        } else {
          window.open(data.signedUrl, '_blank');
        }
      } catch {
        window.open(template.file_url, '_blank');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      processFile(file);
    }
  };

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  if (!isResumeEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Resume Builder & Studio Coming Soon"
          description="Upload, analyze, and build ATS-friendly resumes for direct employer applications."
          icon={FileText}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-display">Resume Center</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Upload your master resume for job applications and explore ATS-optimized resume templates.
          </p>
        </div>

        {/* FEEDBACK ALERTS */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-[var(--radius-lg)] flex items-center gap-3 animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-[var(--color-error)] p-4 rounded-[var(--radius-lg)] flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* ── SECTION 1: STUDENT PRIMARY RESUME UPLOAD ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* UPLOAD BOX (2 COLS) */}
          <div className="md:col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-4 font-display">
              {resume.url ? 'Replace Current Resume' : 'Upload Master Resume'}
            </h2>
            
            <div 
              className={`
                border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center transition-colors
                ${isUploading 
                  ? 'bg-[var(--color-bg-subtle)] border-[var(--color-border)] opacity-60' 
                  : 'bg-[var(--color-bg-subtle)] hover:bg-[var(--color-brand-50)]/50 border-[var(--color-border)] hover:border-[var(--color-brand-300)] cursor-pointer'
                }
              `}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input 
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 bg-white text-[var(--color-brand-500)] border border-[var(--color-brand-200)] rounded-full flex items-center justify-center shadow-xs">
                  {isUploading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-[var(--color-brand-500)] border-t-transparent rounded-full" />
                  ) : (
                    <UploadCloud className="h-6 w-6" />
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {isUploading ? 'Uploading resume...' : 'Click to choose a file or drag and drop'}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    Supports PDF, DOC, DOCX up to 5 MB
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--color-brand-500)]" />
              <span>Your resume is encrypted and only shared with employers you apply to.</span>
            </div>
          </div>

          {/* STATUS / PREVIEW CARD (1 COL) */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-4 font-display">
              Resume Status
            </h2>
            
            {!isFetching && (
              <div className="flex flex-col items-center text-center py-2">
                {resume.url ? (
                  <>
                    <div className="h-12 w-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mb-3">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 mb-2 font-display">
                      Active Resume
                    </span>
                    <p className="text-sm font-bold text-[var(--color-text-primary)] truncate max-w-full px-1" title={resume.filename || ''}>
                      {resume.filename}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mt-1 mb-5">
                      <Calendar className="w-3.5 h-3.5" />
                      Uploaded: {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : 'Recently'}
                    </p>
                    
                    <div className="w-full space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-center text-xs font-semibold" 
                        onClick={handleView}
                        disabled={isUploading}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> View Resume
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-center text-xs text-[var(--color-error)] hover:bg-red-50 hover:text-[var(--color-error)] font-semibold" 
                        onClick={handleDelete}
                        disabled={isUploading}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Resume
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] border border-[var(--color-border)] rounded-full flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6" />
                    </div>
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 font-display">
                      No Resume Found
                    </span>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Upload your resume so verified recruiters can review your profile during applications.
                    </p>
                  </>
                )}
              </div>
            )}
            
            {isFetching && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="animate-spin h-6 w-6 border-2 border-[var(--color-brand-500)] border-t-transparent rounded-full mb-2"></div>
                <p className="text-xs text-[var(--color-text-tertiary)]">Loading resume status...</p>
              </div>
            )}
          </div>

        </div>

        {/* ── SECTION 2: SAMPLE RESUME TEMPLATES ───────────────────────── */}
        <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-brand-600)]" />
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] font-display">
                  Sample Resume Templates
                </h2>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                ATS-optimized format templates for freshers, engineers, analysts, and business roles.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all font-display ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-300)] shadow-xs'
                      : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  {cat === 'all' ? 'All Roles' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* TEMPLATES GRID */}
          {isFetchingTemplates ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">No templates found for this role category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const isUnlocked = template.is_free || canStudentAccessResource(template.minimum_plan, userAccess, ownedProductIds, template.id);
                const reqPlan = template.minimum_plan ? normalizePlanId(template.minimum_plan) : 'starter';
                const planMeta = PLANS[reqPlan] || PLANS.starter;

                return (
                  <div
                    key={template.id}
                    className={`rounded-[var(--radius-xl)] border bg-white p-5 flex flex-col justify-between shadow-[var(--shadow-xs)] hover:border-[var(--color-brand-300)] transition-all ${
                      isUnlocked ? 'border-[var(--color-border)]' : 'border-amber-200/80 bg-amber-50/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] font-display">
                          {template.category}
                        </span>

                        {template.is_free ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Free Template
                          </span>
                        ) : isUnlocked ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Unlocked
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-600" /> {planMeta.name} Plan
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug mb-1.5 font-display">
                        {template.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed mb-4">
                        {template.description}
                      </p>
                    </div>

                    <div className="pt-3.5 border-t border-[var(--color-border)] flex items-center justify-between">
                      <div>
                        {template.is_free ? (
                          <span className="text-xs font-bold text-emerald-700">Free Download</span>
                        ) : (
                          <span className="text-xs font-bold text-[var(--color-text-primary)]">
                            ₹{template.price} <span className="text-[10px] font-normal text-[var(--color-text-tertiary)]">or with {planMeta.name}</span>
                          </span>
                        )}
                      </div>

                      {isUnlocked ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDownloadTemplate(template)}
                          className="text-xs font-semibold shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> Download
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Link href={`/student/store?category=resume_templates`}>
                            <Button variant="outline" size="sm" className="text-xs px-2 text-[var(--color-brand-600)]">
                              <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Buy ₹{template.price}
                            </Button>
                          </Link>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setModalRequiredPlan(template.minimum_plan);
                              setUpgradeFeatureTitle(template.title);
                              setIsUpgradeModalOpen(true);
                            }}
                            className="text-xs font-bold px-2.5 shadow-xs"
                          >
                            Upgrade
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── UPGRADE PROMPT MODAL ─────────────────────────────────────── */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        requiredPlan={modalRequiredPlan}
        featureTitle={upgradeFeatureTitle}
      />
    </StudentLayout>
  );
}
