"use client";

import React, { useState, useEffect, useRef } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  Trash2, 
  Eye,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type ResumeData = {
  url: string | null;
  filename: string | null;
  uploadedAt: string | null;
  fileSize?: string | null; // Optional if we don't store it in DB, we can estimate or fetch it
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export default function ResumePage() {
  const [resume, setResume] = useState<ResumeData>({ url: null, filename: null, uploadedAt: null });
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchResume();
  }, []);

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
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Only PDF, DOC, and DOCX are allowed.";
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

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // File path: {userId}/resume_{timestamp}.ext
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/resume_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('resumes')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Update Profile Table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          resume_url: uploadData.path,
          resume_filename: file.name,
          resume_uploaded_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Refresh State
      await fetchResume();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError("Failed to upload resume. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your resume?")) return;
    
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !resume.url) return;

      // Delete from Storage
      const { error: deleteError } = await supabase
        .storage
        .from('resumes')
        .remove([resume.url]);

      if (deleteError) throw deleteError;

      // Clear from Profile
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
    } catch (err: any) {
      console.error("Delete error:", err);
      setError("Failed to delete resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async () => {
    if (!resume.url) return;
    try {
      // Create a signed URL valid for 60 seconds
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

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Manually trigger the validation and upload flow
      // We create a synthetic event-like object or abstract the upload logic
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/resume_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('resumes')
        .upload(filePath, file, { upsert: true });

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
    } catch (err: any) {
      console.error("Upload error:", err);
      setError("Failed to upload resume.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Resume</h1>
          <p className="text-sm text-slate-500 mt-1">Upload your latest resume to apply for jobs quickly.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: UPLOAD & ACTIONS */}
          <div className="md:col-span-2 space-y-6">
            
            {/* UPLOAD SECTION */}
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                {resume.url ? 'Replace Resume' : 'Upload Resume'}
              </h2>
              
              <div 
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${isUploading ? 'bg-gray-50 border-gray-300 opacity-70' : 'bg-gray-50 hover:bg-blue-50 border-gray-300 hover:border-blue-400 cursor-pointer'}
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
                
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="h-16 w-16 bg-blue-100 text-[var(--color-brand-600)] rounded-full flex items-center justify-center">
                    {isUploading ? (
                      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                    ) : (
                      <UploadCloud className="h-8 w-8" />
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {isUploading ? 'Uploading...' : 'Click to browse or drag and drop'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, DOC, DOCX (Max 5 MB)
                    </p>
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* RIGHT COLUMN: STATUS */}
          <div className="space-y-6">
            
            {/* STATUS CARD */}
            <Card className="p-6 border-slate-200 shadow-sm h-full flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Status</h2>
              
              {!isFetching && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                  {resume.url ? (
                    <>
                      <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Resume Uploaded</h3>
                      <p className="text-sm font-medium text-slate-600 truncate w-full px-2" title={resume.filename || ''}>
                        {resume.filename}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Updated: {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : 'Unknown'}
                      </p>
                      
                      <div className="w-full mt-6 space-y-3">
                        <Button 
                          variant="outline" 
                          className="w-full text-sm" 
                          onClick={handleView}
                          disabled={isUploading}
                        >
                          <Eye className="w-4 h-4 mr-2" /> View Resume
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50" 
                          onClick={handleDelete}
                          disabled={isUploading}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Resume
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">No Resume</h3>
                      <p className="text-sm text-slate-500">
                        You haven't uploaded a resume yet.
                      </p>
                    </>
                  )}
                </div>
              )}
              
              {isFetching && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-16 w-16 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              )}

            </Card>

          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
