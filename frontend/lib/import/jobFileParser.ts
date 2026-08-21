import { JobParseResult } from './jobTypes';
import { parseJobExcel } from './jobExcelParser';
import { parseJobCSV } from './jobCsvParser';
import { parseJobDocx } from './jobDocxParser';
import { parseJobPdf } from './jobPdfParser';
import { parseRawJobTextBlocks } from './jobTextParser';
import { parseJobMarkdown } from './jobMarkdownParser';

/**
 * Main job parser dispatcher: detects file type and delegates to the appropriate parser
 */
export async function parseUploadedJobFile(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  mimeType?: string
): Promise<JobParseResult> {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const fileSizeBytes = Buffer.isBuffer(buffer) ? buffer.length : buffer.byteLength;

  if (extension === 'xlsx' || extension === 'xls' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return parseJobExcel(buffer, fileName);
  }

  if (extension === 'csv' || mimeType === 'text/csv') {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : new TextDecoder().decode(buffer);
    return parseJobCSV(text, fileName, fileSizeBytes);
  }

  if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseJobDocx(buffer, fileName);
  }

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return parseJobPdf(buffer, fileName);
  }

  if (extension === 'md' || mimeType === 'text/markdown') {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : new TextDecoder().decode(buffer);
    return parseJobMarkdown(text, fileName, fileSizeBytes);
  }

  if (extension === 'txt' || mimeType === 'text/plain') {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : new TextDecoder().decode(buffer);
    return parseRawJobTextBlocks(text, fileName, fileSizeBytes, 'txt');
  }

  return {
    fileName,
    fileType: extension || 'unknown',
    fileSizeBytes,
    totalRowsParsed: 0,
    rows: [],
    warnings: [],
    error: `Unsupported file format ".${extension}". Please upload an XLSX, CSV, PDF, DOCX, TXT, or MD file.`,
  };
}
