import mammoth from 'mammoth';
import { ParseResult } from './types';
import { parseRawTextBlocks } from './textParser';

/**
 * Extracts raw text from DOCX binary buffer using mammoth and parses question blocks
 */
export async function parseDocx(buffer: ArrayBuffer | Buffer, fileName: string): Promise<ParseResult> {
  try {
    const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const result = await mammoth.extractRawText({ buffer: nodeBuffer });
    const text = result.value || '';

    if (!text || text.trim().length === 0) {
      return {
        fileName,
        fileType: 'docx',
        fileSizeBytes: nodeBuffer.length,
        totalRowsParsed: 0,
        rows: [],
        warnings: ['The uploaded Word document contains no extractable text.'],
        error: 'The Word document is empty or unreadable.',
      };
    }

    const parseRes = parseRawTextBlocks(text, fileName, nodeBuffer.length, 'docx');
    if (result.messages && result.messages.length > 0) {
      result.messages.forEach(m => parseRes.warnings.push(m.message));
    }

    return parseRes;
  } catch (err: any) {
    console.error('Error parsing DOCX:', err);
    return {
      fileName,
      fileType: 'docx',
      fileSizeBytes: Buffer.isBuffer(buffer) ? buffer.length : buffer.byteLength,
      totalRowsParsed: 0,
      rows: [],
      warnings: [],
      error: `Failed to extract text from Word document: ${err.message || 'Corrupted file.'}`,
    };
  }
}
