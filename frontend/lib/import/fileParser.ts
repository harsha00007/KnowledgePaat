import { ParseResult } from './types';
import { parseExcel } from './excelParser';
import { parseCSV } from './csvParser';
import { parseDocx } from './docxParser';
import { parsePdf } from './pdfParser';
import { parseRawTextBlocks } from './textParser';
import { parseMarkdown } from './markdownParser';

/**
 * Main parser dispatcher: detects file type and delegates to the appropriate parser
 */
export async function parseUploadedFile(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  mimeType?: string
): Promise<ParseResult> {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const fileSizeBytes = Buffer.isBuffer(buffer) ? buffer.length : buffer.byteLength;

  if (extension === 'xlsx' || extension === 'xls' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return parseExcel(buffer, fileName);
  }

  if (extension === 'csv' || mimeType === 'text/csv') {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : new TextDecoder().decode(buffer);
    return parseCSV(text, fileName, fileSizeBytes);
  }

  if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseDocx(buffer, fileName);
  }

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return parsePdf(buffer, fileName);
  }

  if (extension === 'md' || mimeType === 'text/markdown') {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : new TextDecoder().decode(buffer);
    return parseMarkdown(text, fileName, fileSizeBytes);
  }

  if (extension === 'txt' || mimeType === 'text/plain') {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : new TextDecoder().decode(buffer);
    return parseRawTextBlocks(text, fileName, fileSizeBytes, 'txt');
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
