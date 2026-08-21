import { RawImportRow, ParseResult } from './types';
import { parseRawTextBlocks } from './textParser';

/**
 * Parses Markdown (.md) document into raw question rows
 */
export function parseMarkdown(content: string, fileName: string, fileSizeBytes: number): ParseResult {
  // Markdown can be parsed with heading-aware text block parser
  const cleanMd = content
    .replace(/^#+\s+/gm, '') // Strip leading hashes for cleaner title parsing
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Strip bold markers from labels
    .replace(/__([^_]+)__/g, '$1');

  const result = parseRawTextBlocks(cleanMd, fileName, fileSizeBytes, 'md');
  return result;
}
