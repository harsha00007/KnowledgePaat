import mammoth from 'mammoth';
import { JobParseResult } from './jobTypes';
import { parseRawJobTextBlocks } from './jobTextParser';

/**
 * Parses Word (.docx) documents into raw job rows using mammoth
 */
export async function parseJobDocx(buffer: ArrayBuffer | Buffer, fileName: string): Promise<JobParseResult> {
  const fileSizeBytes = Buffer.isBuffer(buffer) ? buffer.length : buffer.byteLength;
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  try {
    const result = await mammoth.extractRawText({ buffer: nodeBuffer });
    const text = result.value || '';

    if (!text.trim()) {
      return {
        fileName,
        fileType: 'docx',
        fileSizeBytes,
        totalRowsParsed: 0,
        rows: [],
        warnings: ['The uploaded Word document contains no readable text.'],
        error: 'The Word (.docx) document is empty.',
      };
    }

    const parseResult = parseRawJobTextBlocks(text, fileName, fileSizeBytes, 'docx');
    if (result.messages && result.messages.length > 0) {
      result.messages.forEach(m => parseResult.warnings.push(`Word Parser: ${m.message}`));
    }

    return parseResult;
  } catch (err: any) {
    console.error('Error parsing DOCX job document:', err);
    return {
      fileName,
      fileType: 'docx',
      fileSizeBytes,
      totalRowsParsed: 0,
      rows: [],
      warnings: [],
      error: `Failed to extract text from Word (.docx) file: ${err.message || 'Corrupted file.'}`,
    };
  }
}
