import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseUploadedFile } from '@/lib/import/fileParser';
import { validateImportRows } from '@/lib/import/questionValidator';
import { normalizeQuestionTitle } from '@/lib/import/questionNormalizer';
import { ImportDefaults, ValidatedQuestionRow } from '@/lib/import/types';

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
      const categoryMappingsJson = formData.get('categoryMappings') as string | null;

      const defaults: ImportDefaults = defaultsJson 
        ? JSON.parse(defaultsJson) 
        : {
            defaultDifficulty: 'Medium',
            defaultMinimumPlan: 'free',
            defaultStatus: 'Active',
            defaultEstimatedTime: '5 mins'
          };

      const categoryMappings: Record<string, string> = categoryMappingsJson
        ? JSON.parse(categoryMappingsJson)
        : {};

      // Parse file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const parseResult = await parseUploadedFile(buffer, file.name, file.type);
      if (parseResult.error && parseResult.rows.length === 0) {
        return NextResponse.json({
          error: parseResult.error,
          parseResult
        }, { status: 422 });
      }

      // Fetch categories from DB
      const { data: categoriesData } = await supabase
        .from('interview_categories')
        .select('id, name')
        .order('order_index', { ascending: true });

      const categories = (categoriesData || []).map(c => ({ id: c.id, name: c.name }));

      // Fetch existing question titles for duplicate detection
      const { data: existingQuestions } = await supabase
        .from('interview_questions')
        .select('title');

      const existingDbTitles = new Set<string>();
      (existingQuestions || []).forEach(q => {
        const norm = normalizeQuestionTitle(q.title);
        if (norm) existingDbTitles.add(norm);
      });

      // Run validation & duplicate detection
      const validationSummary = validateImportRows(
        parseResult.rows,
        categories,
        existingDbTitles,
        defaults,
        categoryMappings
      );

      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileType: parseResult.fileType,
        parseResult,
        validationSummary,
        categories,
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
      questionsToImport,
      totalDuplicates = 0
    } = body as {
      batchId: string;
      fileName: string;
      fileType: string;
      fileSizeBytes: number;
      questionsToImport: ValidatedQuestionRow[];
      totalDuplicates?: number;
    };

    if (!questionsToImport || !Array.isArray(questionsToImport) || questionsToImport.length === 0) {
      return NextResponse.json({ error: 'No questions to import.' }, { status: 400 });
    }

    const currentBatchId = batchId || crypto.randomUUID();
    let importedCount = 0;
    let failedCount = 0;
    const errors: Array<{ rowNumber: number; title: string; error: string }> = [];

    // Process in controlled chunks of 100 rows per batch
    const CHUNK_SIZE = 100;
    for (let i = 0; i < questionsToImport.length; i += CHUNK_SIZE) {
      const chunk = questionsToImport.slice(i, i + CHUNK_SIZE);
      
      const insertPayloads = chunk.map(q => ({
        category_id: q.categoryId,
        title: q.title,
        answer: q.answer,
        tips: q.tips || null,
        common_mistakes: q.common_mistakes || null,
        difficulty: q.difficulty,
        estimated_time: q.estimated_time || '5 mins',
        company_tags: q.company_tags || [],
        technology_tags: q.technology_tags || [],
        tags: q.tags || [],
        status: q.status || 'Active',
        minimum_plan: q.minimum_plan || 'free',
        access_type: q.access_type || (q.minimum_plan === 'free' ? 'Free' : 'Premium'),
        import_batch_id: currentBatchId,
      }));

      const { data, error: insertError } = await supabase
        .from('interview_questions')
        .insert(insertPayloads)
        .select('id');

      if (insertError) {
        console.error(`Batch insert failed for chunk ${i / CHUNK_SIZE}:`, insertError);
        failedCount += chunk.length;
        chunk.forEach(q => {
          errors.push({
            rowNumber: q.rowNumber,
            title: q.title,
            error: insertError.message || 'Database insert failed'
          });
        });
      } else {
        importedCount += data ? data.length : chunk.length;
      }
    }

    // Record import audit entry in interview_question_imports
    try {
      await supabase.from('interview_question_imports').insert({
        batch_id: currentBatchId,
        file_name: fileName || 'unknown',
        file_type: fileType || 'unknown',
        file_size: fileSizeBytes || 0,
        total_rows: questionsToImport.length + totalDuplicates,
        imported_count: importedCount,
        duplicate_count: totalDuplicates,
        error_count: failedCount,
        admin_id: user.id,
      });
    } catch (auditErr) {
      console.warn('Could not record import audit trail:', auditErr);
    }

    return NextResponse.json({
      success: true,
      batchId: currentBatchId,
      totalProcessed: questionsToImport.length,
      importedCount,
      duplicateCount: totalDuplicates,
      failedCount,
      errors,
    });

  } catch (err: any) {
    console.error('Fatal error in bulk-import API:', err);
    return NextResponse.json({ 
      error: err.message || 'An unexpected server error occurred during bulk import.' 
    }, { status: 500 });
  }
}
