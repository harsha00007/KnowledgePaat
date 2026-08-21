import { JobParseResult } from './jobTypes';
import { parseRawJobTextBlocks } from './jobTextParser';

/**
 * Parses Markdown (.md) document into raw job rows
 */
export function parseJobMarkdown(mdText: string, fileName: string, fileSizeBytes: number): JobParseResult {
  // Strip Markdown bold/italic syntax that might interfere with key matching
  const cleaned = mdText
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  return parseRawJobTextBlocks(cleaned, fileName, fileSizeBytes, 'md');
}
