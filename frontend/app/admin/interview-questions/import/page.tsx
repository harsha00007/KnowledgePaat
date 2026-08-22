"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  ArrowLeft, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  Check, 
  Filter,
  Eye,
  Search,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { 
  ImportDefaults, 
  ValidatedQuestionRow, 
  ValidationSummary, 
  ParseResult 
} from '@/lib/import/types';
import { PlanId } from '@/config/plans';

type Step = 'upload' | 'preview' | 'importing' | 'completed';

export default function BulkImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Defaults Configuration
  const [defaults, setDefaults] = useState<ImportDefaults>({
    defaultDifficulty: 'Medium',
    defaultMinimumPlan: 'free',
    defaultStatus: 'Active',
    defaultEstimatedTime: '5 mins'
  });

  // DB Categories
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryMappings, setCategoryMappings] = useState<Record<string, string>>({});

  // Parse & Validation Results
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);

  // Filter & Search in Preview Table
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warning' | 'error' | 'duplicate'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Final Results
  const [importResult, setImportResult] = useState<{
    batchId: string;
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
    errors: Array<{ rowNumber: number; title: string; error: string }>;
  } | null>(null);

  const supabase = createClient();

  // Load existing categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from('interview_categories')
        .select('id, name')
        .order('order_index', { ascending: true });

      if (data && data.length > 0) {
        setCategories(data);
        setDefaults(prev => ({ ...prev, defaultCategoryId: data[0].id, defaultCategoryName: data[0].name }));
      }
    };
    loadCategories();
  }, [supabase]);

  // -------------------------------------------------------------
  // FILE SELECTION & DRAG-AND-DROP
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setGeneralError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['xlsx', 'xls', 'csv', 'pdf', 'docx', 'txt', 'md'];

    if (!ext || !validExtensions.includes(ext)) {
      setGeneralError(`Unsupported file format ".${ext}". Please upload an XLSX, CSV, PDF, DOCX, TXT, or MD file.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setGeneralError('File size exceeds the 10 MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  // -------------------------------------------------------------
  // PARSE FILE & GENERATE PREVIEW
  // -------------------------------------------------------------
  const handleParseFile = async (currentMappings = categoryMappings) => {
    if (!selectedFile) return;

    setIsParsing(true);
    setGeneralError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('defaults', JSON.stringify(defaults));
      formData.append('categoryMappings', JSON.stringify(currentMappings));

      const res = await fetch('/api/admin/interview-questions/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse the file.');
      }

      setParseResult(data.parseResult);
      setValidationSummary(data.validationSummary);
      if (data.categories) setCategories(data.categories);

      // Initialize unmapped categories mappings
      if (data.validationSummary?.unmappedCategories?.length > 0) {
        const initMap: Record<string, string> = { ...currentMappings };
        data.validationSummary.unmappedCategories.forEach((unmapped: string) => {
          if (!initMap[unmapped] && categories.length > 0) {
            initMap[unmapped] = categories[0].id;
          }
        });
        setCategoryMappings(initMap);
      }

      setCurrentStep('preview');
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setGeneralError(err.message || 'An error occurred while parsing the file.');
    } finally {
      setIsParsing(false);
    }
  };

  // -------------------------------------------------------------
  // RE-VALIDATE WITH UPDATED CATEGORY MAPPINGS
  // -------------------------------------------------------------
  const handleRevalidateWithMappings = () => {
    handleParseFile(categoryMappings);
  };

  // -------------------------------------------------------------
  // EXECUTE BATCH IMPORT
  // -------------------------------------------------------------
  const handleExecuteImport = async () => {
    if (!validationSummary) return;

    const validRowsToImport = validationSummary.validatedRows.filter(r => r.isValid && !r.isDuplicate);

    if (validRowsToImport.length === 0) {
      alert('There are no valid, non-duplicate questions ready for import.');
      return;
    }

    setIsImporting(true);
    setCurrentStep('importing');
    setGeneralError(null);

    try {
      const payload = {
        batchId: crypto.randomUUID(),
        fileName: selectedFile?.name || 'bulk_import',
        fileType: parseResult?.fileType || 'unknown',
        fileSizeBytes: parseResult?.fileSizeBytes || 0,
        questionsToImport: validRowsToImport,
        totalDuplicates: validationSummary.duplicateCount,
      };

      const res = await fetch('/api/admin/interview-questions/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete batch import.');
      }

      setImportResult({
        batchId: data.batchId,
        importedCount: data.importedCount,
        duplicateCount: data.duplicateCount,
        failedCount: data.failedCount,
        errors: data.errors || [],
      });

      setCurrentStep('completed');
    } catch (err: any) {
      console.error('Import execution error:', err);
      setGeneralError(err.message || 'Failed to complete batch import.');
      setCurrentStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------
  // DOWNLOAD ERROR REPORT (CSV)
  // -------------------------------------------------------------
  const handleDownloadErrorReport = () => {
    if (!validationSummary) return;

    const errorRows = validationSummary.validatedRows.filter(r => !r.isValid || r.isDuplicate);
    if (errorRows.length === 0) {
      alert('No errors or duplicates found in this file.');
      return;
    }

    const headers = ['Row Number', 'Question Title', 'Category', 'Status', 'Issues / Errors'];
    const csvContent = [
      headers.join(','),
      ...errorRows.map(r => [
        r.rowNumber,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.categoryName || ''}"`,
        r.isDuplicate ? 'Duplicate' : 'Invalid',
        `"${[...(r.isDuplicate ? [r.duplicateReason] : []), ...r.errors].filter(Boolean).join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import_errors_${selectedFile?.name || 'report'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // FILTER PREVIEW ROWS
  // -------------------------------------------------------------
  const filteredPreviewRows = (validationSummary?.validatedRows || []).filter(row => {
    if (previewFilter === 'valid' && (!row.isValid || row.isDuplicate)) return false;
    if (previewFilter === 'warning' && row.warnings.length === 0) return false;
    if (previewFilter === 'error' && (row.isValid || row.isDuplicate)) return false;
    if (previewFilter === 'duplicate' && !row.isDuplicate) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        row.title.toLowerCase().includes(q) ||
        row.categoryName.toLowerCase().includes(q) ||
        row.answer.toLowerCase().includes(q) ||
        row.technology_tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl pb-16">

        {/* BREADCRUMB & HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-tertiary)] mb-1">
              <Link href="/admin/interview-questions" className="hover:text-[var(--color-brand-600)] transition-colors">
                Interview Questions
              </Link>
              <span>›</span>
              <span className="text-[var(--color-text-primary)]">Bulk Import</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Bulk Import Interview Questions
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
              Upload XLSX, CSV, PDF, DOCX, TXT, or Markdown files to validate and import hundreds of questions at once.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/interview-questions">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back to Questions
              </Button>
            </Link>
          </div>
        </div>

        {/* ERROR ALERT */}
        {generalError && (
          <div className="p-4 rounded-[var(--radius-lg)] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3 animate-in fade-in duration-200">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm font-medium text-red-800 dark:text-red-200">
              {generalError}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* STEP 1: UPLOAD & CONFIGURATION                                */}
        {/* ============================================================= */}
        {currentStep === 'upload' && (
          <div className="space-y-6">

            {/* Template Download Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Excel Template</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">Pre-formatted .xlsx with sample rows & guidelines</p>
                  </div>
                </div>
                <a href="/api/admin/interview-questions/template?format=xlsx" download>
                  <Button variant="secondary" size="sm" className="gap-1.5 shrink-0">
                    <Download className="w-3.5 h-3.5" /> Download XLSX
                  </Button>
                </a>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">CSV Template</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">Standard comma-separated format</p>
                  </div>
                </div>
                <a href="/api/admin/interview-questions/template?format=csv" download>
                  <Button variant="secondary" size="sm" className="gap-1.5 shrink-0">
                    <Download className="w-3.5 h-3.5" /> Download CSV
                  </Button>
                </a>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <Card className="border border-[var(--color-border)] shadow-xs">
              <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[var(--color-brand-500)]" />
                  Select or Drag File to Upload
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 space-y-6">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-[var(--radius-xl)] p-8 sm:p-12
                    flex flex-col items-center justify-center text-center cursor-pointer
                    transition-all duration-200 select-none
                    ${isDragOver 
                      ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]/50 dark:bg-[var(--color-brand-950)]/20 scale-[0.99]' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-brand-400)] bg-[var(--color-bg-subtle)]/30 hover:bg-[var(--color-bg-subtle)]'
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="h-16 w-16 rounded-full bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] flex items-center justify-center mb-4 shadow-xs">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    {selectedFile ? selectedFile.name : 'Drag and drop your file here, or click to browse'}
                  </h3>

                  <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 max-w-sm">
                    {selectedFile 
                      ? `Selected file size: ${(selectedFile.size / 1024).toFixed(1)} KB`
                      : 'Supports .xlsx, .csv, .pdf, .docx, .txt, .md files up to 10 MB.'
                    }
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                    {['XLSX', 'CSV', 'PDF', 'DOCX', 'TXT', 'MD'].map(ext => (
                      <span key={ext} className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                        .{ext.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Default Fallback Fields */}
                <div className="pt-4 border-t border-[var(--color-border)] space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[var(--color-brand-500)]" />
                      Default Fallback Settings (For Missing Values)
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      These values will only be used if a question in the file does not explicitly specify them.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Default Category */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Default Category</label>
                      <select
                        value={defaults.defaultCategoryId}
                        onChange={(e) => {
                          const cat = categories.find(c => c.id === e.target.value);
                          setDefaults(prev => ({ ...prev, defaultCategoryId: e.target.value, defaultCategoryName: cat?.name }));
                        }}
                        className="w-full h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Default Difficulty */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Default Difficulty</label>
                      <select
                        value={defaults.defaultDifficulty}
                        onChange={(e) => setDefaults(prev => ({ ...prev, defaultDifficulty: e.target.value as any }))}
                        className="w-full h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>

                    {/* Default Minimum Plan */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Default Minimum Plan</label>
                      <select
                        value={defaults.defaultMinimumPlan}
                        onChange={(e) => setDefaults(prev => ({ ...prev, defaultMinimumPlan: e.target.value as any }))}
                        className="w-full h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      >
                        <option value="free">Free (All Students)</option>
                        <option value="starter">Starter Plan</option>
                        <option value="pro">Pro Plan</option>
                        <option value="premium">Premium Plan</option>
                      </select>
                    </div>

                    {/* Default Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Default Status</label>
                      <select
                        value={defaults.defaultStatus}
                        onChange={(e) => setDefaults(prev => ({ ...prev, defaultStatus: e.target.value as any }))}
                        className="w-full h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      >
                        <option value="Active">Active (Published)</option>
                        <option value="Inactive">Inactive (Draft)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!selectedFile || isParsing}
                    isLoading={isParsing}
                    onClick={() => handleParseFile()}
                    className="w-full sm:w-auto shadow-xs gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Extract & Review Questions
                  </Button>
                </div>

              </CardContent>
            </Card>

          </div>
        )}

        {/* ============================================================= */}
        {/* STEP 2: PREVIEW & VALIDATION TABLE                            */}
        {/* ============================================================= */}
        {currentStep === 'preview' && validationSummary && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Total Extracted</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{validationSummary.totalRows}</p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Ready to Import</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{validationSummary.validCount}</p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Warnings</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{validationSummary.warningCount}</p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Invalid / Errors</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">{validationSummary.errorCount}</p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 shadow-xs col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Duplicates (Skipped)</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">{validationSummary.duplicateCount}</p>
              </div>
            </div>

            {/* Category Mapping Assistant (If unmapped categories exist) */}
            {validationSummary.unmappedCategories.length > 0 && (
              <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Unrecognized Categories Detected ({validationSummary.unmappedCategories.length})
                  </CardTitle>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    The following categories found in your file do not match your database. Map them to an existing category:
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {validationSummary.unmappedCategories.map(unmapped => (
                      <div key={unmapped} className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[120px]" title={unmapped}>
                          "{unmapped}"
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">→</span>
                        <select
                          value={categoryMappings[unmapped] || (categories[0]?.id || '')}
                          onChange={(e) => setCategoryMappings(prev => ({ ...prev, [unmapped]: e.target.value }))}
                          className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-primary)] px-2 focus:ring-1 focus:ring-[var(--color-brand-500)] max-w-[140px]"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="secondary" size="sm" onClick={handleRevalidateWithMappings} className="gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Apply Mappings & Re-validate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Table Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
                <button
                  onClick={() => setPreviewFilter('all')}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
                    previewFilter === 'all' 
                      ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs' 
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  All ({validationSummary.totalRows})
                </button>

                <button
                  onClick={() => setPreviewFilter('valid')}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
                    previewFilter === 'valid' 
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shadow-xs' 
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Valid ({validationSummary.validCount})
                </button>

                <button
                  onClick={() => setPreviewFilter('error')}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
                    previewFilter === 'error' 
                      ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 shadow-xs' 
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Errors ({validationSummary.errorCount})
                </button>

                <button
                  onClick={() => setPreviewFilter('duplicate')}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
                    previewFilter === 'duplicate' 
                      ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shadow-xs' 
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Duplicates ({validationSummary.duplicateCount})
                </button>
              </div>

              {/* Search & Export Error Report */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter extracted questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                </div>

                {(validationSummary.errorCount > 0 || validationSummary.duplicateCount > 0) && (
                  <Button variant="outline" size="sm" onClick={handleDownloadErrorReport} className="gap-1.5 shrink-0 text-xs">
                    <Download className="w-3.5 h-3.5" /> Error Report
                  </Button>
                )}
              </div>
            </div>

            {/* Preview Table */}
            <Card className="border border-[var(--color-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-[var(--color-text-secondary)] w-12 text-center">#</th>
                      <th className="py-2.5 px-3 font-bold text-[var(--color-text-secondary)] w-28">Status</th>
                      <th className="py-2.5 px-3 font-bold text-[var(--color-text-secondary)] w-20">Type</th>
                      <th className="py-2.5 px-4 font-bold text-[var(--color-text-secondary)]">Question Title</th>
                      <th className="py-2.5 px-3 font-bold text-[var(--color-text-secondary)] w-32">Category</th>
                      <th className="py-2.5 px-3 font-bold text-[var(--color-text-secondary)] w-24">Difficulty</th>
                      <th className="py-2.5 px-3 font-bold text-[var(--color-text-secondary)] w-20">Plan</th>
                      <th className="py-2.5 px-4 font-bold text-[var(--color-text-secondary)]">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-[var(--color-text-tertiary)]">
                          No questions matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                          <td className="py-2.5 px-3 text-center text-[var(--color-text-tertiary)] font-mono">
                            {row.rowNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Copy className="w-3 h-3" /> Duplicate
                              </span>
                            ) : row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
                                <XCircle className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                              row.question_type === 'mcq'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {row.question_type === 'mcq' ? 'MCQ' : 'Normal'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-[var(--color-text-primary)] max-w-sm truncate" title={row.title}>
                            {row.title || <span className="text-red-500 italic">Empty Question</span>}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--color-text-secondary)] truncate">
                            {row.categoryName || <span className="text-red-500 italic">Unmapped</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              row.difficulty === 'Easy' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                : row.difficulty === 'Hard'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {row.difficulty}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="capitalize text-[11px] font-medium text-[var(--color-text-secondary)]">
                              {row.minimum_plan}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs">
                            {row.isDuplicate && (
                              <p className="text-purple-600 dark:text-purple-400 font-medium">{row.duplicateReason}</p>
                            )}
                            {row.errors.map((err, idx) => (
                              <p key={idx} className="text-red-600 dark:text-red-400 font-medium">• {err}</p>
                            ))}
                            {row.warnings.map((warn, idx) => (
                              <p key={idx} className="text-amber-600 dark:text-amber-400">• {warn}</p>
                            ))}
                            {row.isValid && !row.isDuplicate && row.warnings.length === 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">Ready to insert</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
              <Button
                variant="outline"
                size="md"
                onClick={() => setCurrentStep('upload')}
                className="w-full sm:w-auto"
              >
                ← Choose Another File
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  disabled={validationSummary.validCount === 0 || isImporting}
                  onClick={handleExecuteImport}
                  className="w-full sm:w-auto shadow-xs gap-2"
                >
                  <Check className="w-4 h-4" />
                  Import {validationSummary.validCount} Valid Questions
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================= */}
        {/* STEP 3: IMPORTING PROGRESS                                    */}
        {/* ============================================================= */}
        {currentStep === 'importing' && (
          <Card className="border border-[var(--color-border)] shadow-xs p-12 text-center space-y-6 animate-in fade-in duration-200">
            <div className="h-16 w-16 rounded-full bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)] text-[var(--color-brand-600)] flex items-center justify-center mx-auto shadow-xs">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Importing Interview Questions...
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Inserting validated questions into your database in controlled batches with duplicate protection.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <div className="w-full bg-[var(--color-bg-muted)] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[var(--color-brand-500)] h-full animate-pulse rounded-full w-3/4" />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] font-medium">
                Please keep this page open until processing finishes.
              </p>
            </div>
          </Card>
        )}

        {/* ============================================================= */}
        {/* STEP 4: COMPLETED REPORT                                      */}
        {/* ============================================================= */}
        {currentStep === 'completed' && importResult && (
          <Card className="border border-[var(--color-border)] shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="p-8 sm:p-12 text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                  Import Completed Successfully!
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Your questions have been securely saved and are immediately available for students in the Interview Preparation module.
                </p>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-2">
                <div className="p-4 rounded-[var(--radius-lg)] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Imported</p>
                  <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                    {importResult.importedCount}
                  </p>
                </div>

                <div className="p-4 rounded-[var(--radius-lg)] bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Skipped (Dupes)</p>
                  <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-300 mt-1">
                    {importResult.duplicateCount}
                  </p>
                </div>

                <div className="p-4 rounded-[var(--radius-lg)] bg-slate-50 dark:bg-slate-900 border border-[var(--color-border)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Errors / Failed</p>
                  <p className="text-2xl font-extrabold text-[var(--color-text-primary)] mt-1">
                    {importResult.failedCount}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-[var(--color-border)]">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSelectedFile(null);
                    setParseResult(null);
                    setValidationSummary(null);
                    setImportResult(null);
                    setCurrentStep('upload');
                  }}
                  className="w-full sm:w-auto"
                >
                  Import Another File
                </Button>

                <Link href="/admin/interview-questions" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto shadow-xs gap-2"
                  >
                    View Questions in Admin <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

            </div>
          </Card>
        )}

      </div>
    </AdminLayout>
  );
}
