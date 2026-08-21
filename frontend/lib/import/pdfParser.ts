import { ParseResult } from './types';
import { parseRawTextBlocks } from './textParser';

/**
 * Extracts text from PDF buffer and parses into question blocks
 */
export async function parsePdf(buffer: ArrayBuffer | Buffer, fileName: string): Promise<ParseResult> {
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
        error: 'This PDF appears to be image-based/scanned and does not contain extractable text. Please use a text-based PDF or an XLSX/CSV file.',
      };
    }

    return parseRawTextBlocks(text, fileName, nodeBuffer.length, 'pdf');
  } catch (err: any) {
    console.error('Error parsing PDF:', err);
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
