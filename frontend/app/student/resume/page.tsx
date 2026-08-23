"use client";

import React, { useState, useEffect, useRef } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  Trash2, 
  Eye, 
  AlertCircle, 
  FileCheck, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

type ResumeData = {
  url: string | null;
  filename: string | null;
  uploadedAt: string | null;
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
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isResumeEnabled) {
      fetchResume();
    } else {
      setIsFetching(false);
    }
  }, [isResumeEnabled]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchResume = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('resume_url, resume_filename, resume_uploaded_at')
        .eq('id', user.id)
        .single();

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
    } catch (err: any) {
      console.error("Error fetching resume:", err);
    } finally {
      setIsFetching(false);
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

      await fetchResume();
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

      // Step 1: Delete from storage. If this fails, DB record is NOT touched.
      const { error: deleteError } = await supabase
        .storage
        .from('resumes')
        .remove([resume.url]);

      if (deleteError) {
        console.error("Storage delete error:", deleteError);
        // Provide a meaningful message — storage 403 means missing RLS DELETE policy
        throw new Error(
          deleteError.message?.includes('403') || deleteError.message?.toLowerCase().includes('unauthorized')
            ? "Permission denied. Please contact support if this persists."
            : "Failed to delete resume file. Please try again."
        );
      }

      // Step 2: Only clear the DB reference after confirmed storage deletion
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          resume_url: null,
          resume_filename: null,
          resume_uploaded_at: null,
        })
        .eq('id', user.id);

      if (dbError) {
        // File was deleted from storage but DB update failed — log for support
        console.error("Profile update error after storage delete:", dbError);
        throw new Error("Resume file was removed but profile could not be updated. Please refresh the page.");
      }

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
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Resume</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Upload and manage your primary resume to apply directly to verified job postings.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* UPLOAD BOX (2 COLS) */}
          <div className="md:col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-4">
              {resume.url ? 'Replace Current Resume' : 'Upload Resume'}
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
              <span>Your resume is encrypted and only shared with companies you explicitly apply to.</span>
            </div>
          </div>

          {/* STATUS / PREVIEW CARD (1 COL) */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-4">
              Resume Status
            </h2>
            
            {!isFetching && (
              <div className="flex flex-col items-center text-center py-2">
                {resume.url ? (
                  <>
                    <div className="h-12 w-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mb-3">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 mb-2">
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
                        className="w-full justify-center text-xs" 
                        onClick={handleView}
                        disabled={isUploading}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> View Resume
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="w-full justify-center text-xs text-[var(--color-error)] hover:bg-red-50 hover:text-[var(--color-error)]" 
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
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
                      No Resume Found
                    </span>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Upload your resume so employers can review your profile during job applications.
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
      </div>
    </StudentLayout>
  );
}
