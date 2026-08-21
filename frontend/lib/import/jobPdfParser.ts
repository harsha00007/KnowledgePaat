import { JobParseResult } from './jobTypes';
import { parseRawJobTextBlocks } from './jobTextParser';

/**
 * Extracts text from PDF buffer and parses into job blocks
 */
export async function parseJobPdf(buffer: ArrayBuffer | Buffer, fileName: string): Promise<JobParseResult> {
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  try {
    // Dynamic import to prevent bundler / client evaluation issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(nodeBuffer);
    const text = data.text ? data.text.trim() : '';

    if (!text || text.length < 10) {
      return {
        fileName,
        fileType: 'pdf',
        fileSizeBytes: nodeBuffer.length,
        totalRowsParsed: 0,
        rows: [],
        warnings: [],
        error: 'This PDF does not contain extractable text. Please use a text-based PDF, XLSX, CSV, DOCX, TXT, or MD file.',
      };
    }

    return parseRawJobTextBlocks(text, fileName, nodeBuffer.length, 'pdf');
  } catch (err: any) {
    console.error('Error parsing Job PDF:', err);
    return {
      fileName,
      fileType: 'pdf',
      fileSizeBytes: nodeBuffer.length,
      totalRowsParsed: 0,
      rows: [],
      warnings: [],
      error: `Failed to read PDF document: ${err.message || 'The PDF file could not be parsed.'}`,
    };
  }
}
