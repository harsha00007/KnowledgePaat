"use client";

import React, { useState, useRef } from 'react';
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
  Building2,
  Briefcase,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { 
  JobImportDefaults, 
  ValidatedJobRow, 
  JobValidationSummary, 
  JobParseResult,
  ValidWorkMode,
  ValidEmploymentType,
  ValidMinimumPlan,
  ValidJobStatus
} from '@/lib/import/jobTypes';

type Step = 'upload' | 'preview' | 'importing' | 'completed';

export default function JobBulkImportPage() {
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
  const [defaults, setDefaults] = useState<JobImportDefaults>({
    defaultWorkMode: 'Remote',
    defaultExperience: 'Fresher',
    defaultMinimumPlan: 'free',
    defaultEmploymentType: 'Full-time',
    defaultStatus: 'Active',
    defaultCategory: 'Software Development'
  });

  // Parse & Validation Results
  const [parseResult, setParseResult] = useState<JobParseResult | null>(null);
  const [validationSummary, setValidationSummary] = useState<JobValidationSummary | null>(null);

  // Filter & Search in Preview Table
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warning' | 'error' | 'duplicate'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected row for detail drawer/modal
  const [inspectRow, setInspectRow] = useState<ValidatedJobRow | null>(null);

  // Final Results
  const [importResult, setImportResult] = useState<{
    batchId: string;
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
    errors: Array<{ rowNumber: number; title: string; company: string; error: string }>;
  } | null>(null);

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
  const handleParseFile = async () => {
    if (!selectedFile) return;

    setIsParsing(true);
    setGeneralError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('defaults', JSON.stringify(defaults));

      const res = await fetch('/api/admin/jobs/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse the file.');
      }

      setParseResult(data.parseResult);
      setValidationSummary(data.validationSummary);
      setCurrentStep('preview');
    } catch (err: any) {
      console.error('Error parsing job file:', err);
      setGeneralError(err.message || 'An error occurred while parsing the file.');
    } finally {
      setIsParsing(false);
    }
  };

  // -------------------------------------------------------------
  // EXECUTE BATCH IMPORT
  // -------------------------------------------------------------
  const handleExecuteImport = async () => {
    if (!validationSummary) return;

    const validRowsToImport = validationSummary.validatedRows.filter(r => r.isValid && !r.isDuplicate);

    if (validRowsToImport.length === 0) {
      alert('There are no valid, non-duplicate jobs ready for import.');
      return;
    }

    setIsImporting(true);
    setCurrentStep('importing');
    setGeneralError(null);

    try {
      const payload = {
        batchId: crypto.randomUUID(),
        fileName: selectedFile?.name || 'jobs_bulk_import',
        fileType: parseResult?.fileType || 'xlsx',
        fileSizeBytes: parseResult?.fileSizeBytes || 0,
        jobsToImport: validRowsToImport,
        totalDuplicates: validationSummary.duplicateCount,
      };

      const res = await fetch('/api/admin/jobs/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete job batch import.');
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
      console.error('Error executing job import:', err);
      setGeneralError(err.message || 'Batch import failed. Please try again.');
      setCurrentStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------
  // DOWNLOAD ERROR REPORT CSV
  // -------------------------------------------------------------
  const handleDownloadErrorReport = () => {
    if (!validationSummary) return;

    const invalidRows = validationSummary.validatedRows.filter(r => !r.isValid || r.isDuplicate || r.warnings.length > 0);

    const headers = ['Row Number', 'Company Name', 'Job Title', 'Status', 'Issues'];
    const csvRows = invalidRows.map(r => {
      const issues = [...r.errors, ...(r.isDuplicate ? [r.duplicateReason || 'Duplicate'] : []), ...r.warnings].join(' | ');
      return [
        r.rowNumber,
        `"${r.company_name.replace(/"/g, '""')}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        r.isDuplicate ? 'DUPLICATE' : r.isValid ? 'WARNING' : 'ERROR',
        `"${issues.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `job_import_validation_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // RESET IMPORTER
  // -------------------------------------------------------------
  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setValidationSummary(null);
    setImportResult(null);
    setInspectRow(null);
    setGeneralError(null);
    setCurrentStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // -------------------------------------------------------------
  // FILTERING PREVIEW ROWS
  // -------------------------------------------------------------
  const displayedRows = (validationSummary?.validatedRows || []).filter(r => {
    // Tab filter
    if (previewFilter === 'valid' && (!r.isValid || r.isDuplicate || r.warnings.length > 0)) return false;
    if (previewFilter === 'warning' && (r.warnings.length === 0 || !r.isValid || r.isDuplicate)) return false;
    if (previewFilter === 'error' && (r.isValid || r.isDuplicate)) return false;
    if (previewFilter === 'duplicate' && !r.isDuplicate) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchCompany = r.company_name.toLowerCase().includes(q);
      const matchLocation = r.location.toLowerCase().includes(q);
      const matchSkills = r.required_skills.some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchCompany && !matchLocation && !matchSkills) return false;
    }

    return true;
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Link 
              href="/admin/jobs" 
              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Job Management
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-indigo-600" />
              Bulk Import Jobs
            </h1>
            <p className="text-sm text-slate-500">
              Upload spreadsheets, Word, PDF, or text files to parse and import hundreds of job postings at once.
            </p>
          </div>

          {/* Stepper Pill Indicator */}
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200/60 shadow-xs">
            <span className={`px-3 py-1 rounded-lg transition-all ${currentStep === 'upload' ? 'bg-white text-indigo-600 shadow-xs font-bold' : ''}`}>
              1. Upload
            </span>
            <span className={`px-3 py-1 rounded-lg transition-all ${currentStep === 'preview' ? 'bg-white text-indigo-600 shadow-xs font-bold' : ''}`}>
              2. Preview & Validate
            </span>
            <span className={`px-3 py-1 rounded-lg transition-all ${currentStep === 'importing' || currentStep === 'completed' ? 'bg-white text-emerald-600 shadow-xs font-bold' : ''}`}>
              3. Import
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {generalError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 shadow-xs">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <div className="font-semibold">Import Error</div>
              <div>{generalError}</div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: UPLOAD & DEFAULTS                                  */}
        {/* ========================================================= */}
        {currentStep === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Dropzone Area */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-indigo-600" />
                    Select or Drop File
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  
                  {/* Dropzone Container */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                        : selectedFile
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/40 hover:bg-indigo-50/20'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf,.docx,.txt,.md"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        selectedFile ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {selectedFile ? <FileSpreadsheet className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
                      </div>

                      <div className="space-y-1">
                        {selectedFile ? (
                          <>
                            <div className="text-base font-semibold text-slate-900">{selectedFile.name}</div>
                            <div className="text-xs text-slate-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB • Ready for analysis
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-slate-800">
                              Click to choose a file, or drag and drop here
                            </div>
                            <div className="text-xs text-slate-400">
                              Supports Excel (.xlsx), CSV, PDF, Word (.docx), TXT, and Markdown (.md) up to 10 MB
                            </div>
                          </>
                        )}
                      </div>

                      {!selectedFile && (
                        <Button type="button" variant="outline" size="sm" className="mt-2 text-xs font-semibold pointer-events-none">
                          Browse Files
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Format Pills */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-medium text-slate-500">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/60">.XLSX / .XLS</span>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/60">.CSV</span>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/60">.PDF</span>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/60">.DOCX</span>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/60">.TXT</span>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/60">.MD</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a
                        href="/api/admin/jobs/template?format=xlsx"
                        download="gradzenx_jobs_template.xlsx"
                        className="w-full sm:w-auto"
                      >
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-slate-200 gap-1.5">
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          Excel Template
                        </Button>
                      </a>
                      <a
                        href="/api/admin/jobs/template?format=csv"
                        download="gradzenx_jobs_template.csv"
                        className="w-full sm:w-auto"
                      >
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-slate-200 gap-1.5">
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          CSV Template
                        </Button>
                      </a>
                    </div>

                    <Button
                      onClick={handleParseFile}
                      disabled={!selectedFile || isParsing}
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 shadow-sm gap-2"
                    >
                      {isParsing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Parsing Document...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Analyze & Preview Jobs
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions Callout */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 text-xs text-indigo-900 space-y-2.5">
                <div className="font-semibold flex items-center gap-1.5 text-indigo-950">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Format Requirements & Guidelines
                </div>
                <ul className="list-disc list-inside space-y-1 text-indigo-800/90 leading-relaxed">
                  <li><strong>Required Columns:</strong> Company Name, Job Title, Location, and Official Apply URL.</li>
                  <li><strong>Work Mode:</strong> Supported values are <em>Remote</em>, <em>Hybrid</em>, or <em>On-site</em>.</li>
                  <li><strong>Experience:</strong> E.g., <em>Fresher</em>, <em>0-1 Years</em>, <em>1-3 Years</em>, or <em>3+ Years</em>.</li>
                  <li><strong>Access Plan:</strong> Set to <em>free</em>, <em>starter</em>, <em>pro</em>, or <em>premium</em> to control student visibility.</li>
                  <li><strong>Duplicate Prevention:</strong> Jobs with matching Company Name, Job Title, and Location will automatically be identified as duplicates and skipped.</li>
                </ul>
              </div>
            </div>

            {/* Right 1 Col: Default Values & Rules */}
            <div className="space-y-6">
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Default Fallback Values
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                  <p className="text-slate-500">
                    These default values will only be applied when a row is missing an optional field in your file.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Default Work Mode</label>
                      <select
                        value={defaults.defaultWorkMode}
                        onChange={e => setDefaults(prev => ({ ...prev, defaultWorkMode: e.target.value as ValidWorkMode }))}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="On-site">On-site</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Default Experience</label>
                      <select
                        value={defaults.defaultExperience}
                        onChange={e => setDefaults(prev => ({ ...prev, defaultExperience: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Fresher">Fresher</option>
                        <option value="0-1 Years">0-1 Years</option>
                        <option value="1-3 Years">1-3 Years</option>
                        <option value="3+ Years">3+ Years</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Default Employment Type</label>
                      <select
                        value={defaults.defaultEmploymentType}
                        onChange={e => setDefaults(prev => ({ ...prev, defaultEmploymentType: e.target.value as ValidEmploymentType }))}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Internship">Internship</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Default Category</label>
                      <select
                        value={defaults.defaultCategory}
                        onChange={e => setDefaults(prev => ({ ...prev, defaultCategory: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Software Development">Software Development</option>
                        <option value="Data & Analytics">Data & Analytics</option>
                        <option value="Design & UI/UX">Design & UI/UX</option>
                        <option value="Product & Operations">Product & Operations</option>
                        <option value="Marketing & Sales">Marketing & Sales</option>
                        <option value="Finance & Accounting">Finance & Accounting</option>
                        <option value="Human Resources">Human Resources</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Default Minimum Plan</label>
                      <select
                        value={defaults.defaultMinimumPlan}
                        onChange={e => setDefaults(prev => ({ ...prev, defaultMinimumPlan: e.target.value as ValidMinimumPlan }))}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="free">Free (All Students)</option>
                        <option value="starter">Starter & Above</option>
                        <option value="pro">Pro & Above</option>
                        <option value="premium">Premium Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Default Publishing Status</label>
                      <select
                        value={defaults.defaultStatus}
                        onChange={e => setDefaults(prev => ({ ...prev, defaultStatus: e.target.value as ValidJobStatus }))}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Active">Active (Published to Students)</option>
                        <option value="Inactive">Inactive (Draft / Hidden)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: PREVIEW & VALIDATION TABLE                         */}
        {/* ========================================================= */}
        {currentStep === 'preview' && validationSummary && (
          <div className="space-y-6">
            
            {/* Stat Counters Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-slate-500">Total Parsed</div>
                <div className="text-2xl font-bold text-slate-900">{validationSummary.totalRows}</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ready to Import
                </div>
                <div className="text-2xl font-bold text-emerald-800">{validationSummary.validCount}</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Warnings
                </div>
                <div className="text-2xl font-bold text-amber-800">{validationSummary.warningCount}</div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5 text-indigo-600" /> Duplicates (Skip)
                </div>
                <div className="text-2xl font-bold text-indigo-800">{validationSummary.duplicateCount}</div>
              </div>

              <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-red-700 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-red-600" /> Errors (Excluded)
                </div>
                <div className="text-2xl font-bold text-red-800">{validationSummary.errorCount}</div>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${previewFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  All ({validationSummary.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('valid')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${previewFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
                >
                  Valid ({validationSummary.validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('warning')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${previewFilter === 'warning' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
                >
                  Warnings ({validationSummary.warningCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('duplicate')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${previewFilter === 'duplicate' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-50'}`}
                >
                  Duplicates ({validationSummary.duplicateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('error')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${previewFilter === 'error' ? 'bg-red-600 text-white' : 'text-red-700 hover:bg-red-50'}`}
                >
                  Errors ({validationSummary.errorCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search in preview..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                  />
                </div>

                {(validationSummary.warningCount > 0 || validationSummary.errorCount > 0 || validationSummary.duplicateCount > 0) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadErrorReport}
                    className="text-xs font-semibold text-slate-600 gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    CSV Report
                  </Button>
                )}
              </div>
            </div>

            {/* Preview Table */}
            <Card className="border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 z-10 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[160px]">Company</th>
                      <th className="py-3 px-4 min-w-[200px]">Job Title</th>
                      <th className="py-3 px-4 min-w-[130px]">Location</th>
                      <th className="py-3 px-3">Work Mode</th>
                      <th className="py-3 px-3">Experience</th>
                      <th className="py-3 px-3">Plan</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 min-w-[160px]">Validation</th>
                      <th className="py-3 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          No jobs matching the current filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map(row => (
                        <tr 
                          key={row.rowNumber} 
                          className={`hover:bg-slate-50/60 transition-colors ${
                            row.isDuplicate 
                              ? 'bg-indigo-50/20' 
                              : !row.isValid 
                              ? 'bg-red-50/20' 
                              : row.warnings.length > 0 
                              ? 'bg-amber-50/10' 
                              : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">{row.rowNumber}</td>
                          
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{row.company_name || <em className="text-red-500 font-normal">Missing</em>}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-800 font-medium">
                            <div className="truncate max-w-[220px]" title={row.title}>
                              {row.title || <em className="text-red-500 font-normal">Missing Title</em>}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{row.location || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            <span className={`inline-flex px-2 py-0.5 rounded-md font-medium text-[11px] ${
                              row.work_mode === 'Remote' ? 'bg-purple-50 text-purple-700 border border-purple-200/60' :
                              row.work_mode === 'Hybrid' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {row.work_mode}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-slate-600">{row.experience}</td>

                          <td className="py-3 px-3">
                            <span className="capitalize font-medium text-slate-700">
                              {row.minimum_plan}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {row.status}
                            </span>
                          </td>

                          {/* Validation Badge */}
                          <td className="py-3 px-4">
                            {row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-semibold text-[11px]" title={row.duplicateReason}>
                                <Copy className="w-3 h-3 text-indigo-600" /> Duplicate (Skip)
                              </span>
                            ) : !row.isValid ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200/70 font-semibold text-[11px]">
                                  <XCircle className="w-3 h-3 text-red-600" /> Invalid
                                </span>
                                <div className="text-[10px] text-red-600 truncate max-w-[160px]" title={row.errors.join(', ')}>
                                  {row.errors[0]}
                                </div>
                              </div>
                            ) : row.warnings.length > 0 ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 font-semibold text-[11px]">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Valid w/ Notice
                                </span>
                                <div className="text-[10px] text-amber-600 truncate max-w-[160px]" title={row.warnings.join(', ')}>
                                  {row.warnings[0]}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectRow(row)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                              title="Inspect full job details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Ready to import <strong className="text-slate-900 font-bold">{validationSummary.validCount}</strong> valid jobs 
                  {validationSummary.duplicateCount > 0 && <span> ({validationSummary.duplicateCount} duplicates will be skipped)</span>}.
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('upload')}
                    className="w-full sm:w-auto text-xs font-semibold border-slate-300"
                  >
                    Back to Upload
                  </Button>

                  <Button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={validationSummary.validCount === 0 || isImporting}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6 shadow-sm gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Import {validationSummary.validCount} Valid Jobs
                  </Button>
                </div>
              </div>
            </Card>

            {/* Inspect Modal / Drawer */}
            {inspectRow && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-xl border border-slate-200">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-mono text-slate-400">Row {inspectRow.rowNumber}</span>
                      <h3 className="text-base font-bold text-slate-900">{inspectRow.title}</h3>
                      <p className="text-xs text-slate-500">{inspectRow.company_name} • {inspectRow.location}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setInspectRow(null)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-slate-400 font-medium">Work Mode</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{inspectRow.work_mode}</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-slate-400 font-medium">Experience</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{inspectRow.experience}</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-slate-400 font-medium">Min Plan</div>
                      <div className="font-semibold text-slate-800 mt-0.5 capitalize">{inspectRow.minimum_plan}</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-slate-400 font-medium">Compensation</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{inspectRow.salary || 'Not specified'}</div>
                    </div>
                  </div>

                  {inspectRow.apply_url && (
                    <div className="text-xs">
                      <div className="font-medium text-slate-500 mb-1">Official Apply URL</div>
                      <a href={inspectRow.apply_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                        {inspectRow.apply_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {inspectRow.required_skills.length > 0 && (
                    <div className="text-xs space-y-1.5">
                      <div className="font-medium text-slate-500">Required Skills</div>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectRow.required_skills.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {inspectRow.full_description && (
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-slate-500">Job Description</div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-line">
                        {inspectRow.full_description}
                      </div>
                    </div>
                  )}

                  {inspectRow.responsibilities.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-slate-500">Responsibilities</div>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {inspectRow.responsibilities.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(inspectRow.errors.length > 0 || inspectRow.warnings.length > 0) && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="font-semibold text-slate-700">Validation Diagnostics</div>
                      {inspectRow.errors.map((e, idx) => (
                        <div key={idx} className="text-red-600 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 shrink-0" /> {e}
                        </div>
                      ))}
                      {inspectRow.warnings.map((w, idx) => (
                        <div key={idx} className="text-amber-600 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button type="button" size="sm" onClick={() => setInspectRow(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: IMPORTING PROGRESS                                */}
        {/* ========================================================= */}
        {currentStep === 'importing' && (
          <Card className="border-slate-200 shadow-sm max-w-xl mx-auto text-center p-8 sm:p-12 space-y-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Importing Jobs...</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Inserting valid job records in chunked batches into the database. Please do not close or refresh this page.
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
              <div className="bg-indigo-600 h-full w-3/4 rounded-full animate-pulse transition-all duration-500" />
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Processing batch payload...
            </div>
          </Card>
        )}

        {/* ========================================================= */}
        {/* STEP 4: COMPLETED REPORT                                  */}
        {/* ========================================================= */}
        {currentStep === 'completed' && importResult && (
          <Card className="border-slate-200 shadow-sm max-w-2xl mx-auto p-8 sm:p-10 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-slate-900">Job Import Completed!</h2>
              <p className="text-xs text-slate-500">
                Your batch job import has been processed and saved successfully.
              </p>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl space-y-1">
                <div className="text-xs font-semibold text-emerald-700">Successfully Imported</div>
                <div className="text-2xl font-bold text-emerald-800">{importResult.importedCount}</div>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl space-y-1">
                <div className="text-xs font-semibold text-indigo-700">Duplicates Skipped</div>
                <div className="text-2xl font-bold text-indigo-800">{importResult.duplicateCount}</div>
              </div>

              <div className="p-4 bg-red-50/70 border border-red-200/70 rounded-2xl space-y-1">
                <div className="text-xs font-semibold text-red-700">Failed Records</div>
                <div className="text-2xl font-bold text-red-800">{importResult.failedCount}</div>
              </div>
            </div>

            {/* Failed records table if any */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="text-left space-y-2 pt-2">
                <div className="text-xs font-semibold text-red-700">Failed Rows ({importResult.errors.length}):</div>
                <div className="max-h-40 overflow-y-auto border border-red-200 rounded-xl p-3 bg-red-50/40 text-xs space-y-1">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="text-red-700 font-mono text-[11px]">
                      Row {err.rowNumber} ({err.company} - {err.title}): {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="w-full sm:w-auto text-xs font-semibold border-slate-300"
              >
                Import Another File
              </Button>

              <Button
                type="button"
                onClick={() => router.push('/admin/jobs')}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 shadow-sm"
              >
                View Jobs in Management Table
              </Button>
            </div>
          </Card>
        )}

      </div>
    </AdminLayout>
  );
}
