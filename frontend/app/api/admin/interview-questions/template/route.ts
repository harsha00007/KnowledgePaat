import { NextRequest, NextResponse } from 'next/server';
import { generateExcelTemplate, generateCsvTemplate } from '@/lib/import/templateGenerator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'xlsx';

  if (format === 'csv') {
    const csvContent = generateCsvTemplate();
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gradzenx_questions_template.csv"',
      },
    });
  }

  // Default: Excel (.xlsx)
  const excelBuffer = generateExcelTemplate();
  return new NextResponse(Buffer.from(excelBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="gradzenx_questions_template.xlsx"',
    },
  });
}
