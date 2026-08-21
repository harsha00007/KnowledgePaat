import { NextRequest, NextResponse } from 'next/server';
import { generateJobExcelTemplate, generateJobCsvTemplate } from '@/lib/import/jobTemplateGenerator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'xlsx';

  if (format === 'csv') {
    const csvContent = generateJobCsvTemplate();
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gradzenx_jobs_template.csv"',
      },
    });
  }

  // Default: Excel (.xlsx)
  const excelBuffer = generateJobExcelTemplate();
  return new NextResponse(excelBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="gradzenx_jobs_template.xlsx"',
    },
  });
}
