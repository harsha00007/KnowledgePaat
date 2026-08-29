import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseUploadedJobFile } from '@/lib/import/jobFileParser';
import { validateJobRows } from '@/lib/import/jobValidator';
import { createJobDuplicateSignature } from '@/lib/import/jobNormalizer';
import { JobImportDefaults, ValidatedJobRow } from '@/lib/import/jobTypes';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export const maxDuration = 60; // Allow sufficient processing time for large file imports

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate & Authorize Admin
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as an administrator.' }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    // Enforce Rate Limit for Admin Bulk Job Imports
    const rl = await checkRateLimit(`admin_jobs_import:${user.id}`, RATE_LIMIT_POLICIES.ADMIN_BULK_IMPORT);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const contentType = req.headers.get('content-type') || '';

    // -------------------------------------------------------------
    // MODE A: File Upload & Parse Request (multipart/form-data)
    // -------------------------------------------------------------
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ error: 'No file was provided.' }, { status: 400 });
      }

      // Check max 10MB
      const maxBytes = 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json({ error: 'File size exceeds the 10 MB limit.' }, { status: 400 });
      }

      const defaultsJson = formData.get('defaults') as string | null;

      const defaults: JobImportDefaults = defaultsJson 
        ? JSON.parse(defaultsJson) 
        : {
            defaultWorkMode: 'Remote',
            defaultExperience: 'Fresher',
            defaultMinimumPlan: 'free',
            defaultEmploymentType: 'Full-time',
            defaultStatus: 'Active',
            defaultCategory: 'Software Development'
          };

      // Parse file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const parseResult = await parseUploadedJobFile(buffer, file.name, file.type);
      if (parseResult.error && parseResult.rows.length === 0) {
        return NextResponse.json({
          error: parseResult.error,
          parseResult
        }, { status: 422 });
      }

      // Fetch existing jobs for duplicate detection
      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('company_name, title, location');

      const existingDbSignatures = new Set<string>();
      (existingJobs || []).forEach(j => {
        const sig = createJobDuplicateSignature(j.company_name, j.title, j.location);
        if (sig) existingDbSignatures.add(sig);
      });

      // Run validation & duplicate detection
      const validationSummary = validateJobRows(
        parseResult.rows,
        existingDbSignatures,
        defaults
      );

      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileType: parseResult.fileType,
        parseResult,
        validationSummary,
      });
    }

    // -------------------------------------------------------------
    // MODE B: Execute Batch Import (application/json)
    // -------------------------------------------------------------
    const body = await req.json();
    const { 
      batchId, 
      fileName, 
      fileType, 
      fileSizeBytes, 
      jobsToImport,
      totalDuplicates = 0
    } = body as {
      batchId: string;
      fileName: string;
      fileType: string;
      fileSizeBytes: number;
      jobsToImport: ValidatedJobRow[];
      totalDuplicates?: number;
    };

    if (!jobsToImport || !Array.isArray(jobsToImport) || jobsToImport.length === 0) {
      return NextResponse.json({ error: 'No jobs to import.' }, { status: 400 });
    }

    const currentBatchId = batchId || crypto.randomUUID();
    let importedCount = 0;
    let failedCount = 0;
    const errors: Array<{ rowNumber: number; title: string; company: string; error: string }> = [];

    // Process in controlled chunks of 100 rows per batch
    const CHUNK_SIZE = 100;
    for (let i = 0; i < jobsToImport.length; i += CHUNK_SIZE) {
      const chunk = jobsToImport.slice(i, i + CHUNK_SIZE);
      
      const insertPayloads = chunk.map(j => ({
        company_name: j.company_name,
        company_logo_url: j.company_logo_url || null,
        title: j.title,
        category: j.category || 'Software Development',
        short_description: j.short_description || (j.full_description ? j.full_description.slice(0, 160) : ''),
        full_description: j.full_description || j.short_description || '',
        responsibilities: j.responsibilities || [],
        required_skills: j.required_skills || [],
        experience: j.experience || 'Fresher',
        salary: j.salary || null,
        location: j.location,
        work_mode: j.work_mode || 'Remote',
        employment_type: j.employment_type || 'Full-time',
        apply_url: j.apply_url,
        status: j.status || 'Active',
        minimum_plan: j.minimum_plan || 'free',
        access_type: j.access_type || (j.minimum_plan === 'free' ? 'Free' : 'Premium'),
        import_batch_id: currentBatchId,
      }));

      const { data, error: insertError } = await supabase
        .from('jobs')
        .insert(insertPayloads)
        .select('id');

      if (insertError) {
        console.error(`Batch insert failed for chunk ${i / CHUNK_SIZE}:`, insertError);
        failedCount += chunk.length;
        chunk.forEach(j => {
          errors.push({
            rowNumber: j.rowNumber,
            title: j.title,
            company: j.company_name,
            error: insertError.message || 'Database insert failed'
          });
        });
      } else {
        importedCount += data ? data.length : chunk.length;
      }
    }

    // Record import audit entry in job_imports if table exists
    try {
      await supabase.from('job_imports').insert({
        batch_id: currentBatchId,
        file_name: fileName || 'unknown',
        file_type: fileType || 'unknown',
        file_size: fileSizeBytes || 0,
        total_rows: jobsToImport.length + totalDuplicates,
        imported_count: importedCount,
        duplicate_count: totalDuplicates,
        error_count: failedCount,
        admin_id: user.id,
      });
    } catch (auditErr) {
      // Table may be optional / created later
      console.warn('Could not record job import audit trail:', auditErr);
    }

    return NextResponse.json({
      success: true,
      batchId: currentBatchId,
      totalProcessed: jobsToImport.length,
      importedCount,
      duplicateCount: totalDuplicates,
      failedCount,
      errors,
    });

  } catch (err: any) {
    console.error('Fatal error in job bulk-import API:', err);
    return NextResponse.json({ 
      error: err.message || 'An unexpected server error occurred during job bulk import.' 
    }, { status: 500 });
  }
}
