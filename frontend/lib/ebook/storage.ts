import crypto from 'crypto';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  verifiedMimeType?: string;
  byteSize?: number;
  checksumSha256?: string;
}

export const STORAGE_LIMITS = {
  COVER_MAX_BYTES: 2 * 1024 * 1024,      // 2 MB
  PDF_MAX_BYTES: 100 * 1024 * 1024,      // 100 MB
  RESOURCE_MAX_BYTES: 50 * 1024 * 1024,  // 50 MB
};

export const STORAGE_BUCKETS = {
  COVERS: 'ebook-covers',
  PDFS: 'ebook-pdfs',
};

/**
 * Validate file content signatures (magic bytes) to prevent extension spoofing
 */
export function detectFileSignature(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // 2. JPEG: 0xFF 0xD8 0xFF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // 3. PNG: 0x89 0x50 0x4E 0x47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // 4. WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('utf8', 0, 4) === 'RIFF' &&
    buffer.toString('utf8', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Calculate SHA-256 checksum of buffer
 */
export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate cover image upload
 */
export function validateCoverUpload(buffer: Buffer, originalFilename: string): FileValidationResult {
  const byteSize = buffer.length;
  if (byteSize === 0) {
    return { isValid: false, error: 'Cover image file is empty.' };
  }
  if (byteSize > STORAGE_LIMITS.COVER_MAX_BYTES) {
    return { isValid: false, error: `Cover image exceeds maximum size of 2MB (actual: ${(byteSize / (1024 * 1024)).toFixed(2)}MB).` };
  }

  const detectedMime = detectFileSignature(buffer);
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!detectedMime || !allowedMimes.includes(detectedMime)) {
    return {
      isValid: false,
      error: 'Invalid image signature. Only valid JPEG, PNG, or WebP image files are permitted.'
    };
  }

  return {
    isValid: true,
    verifiedMimeType: detectedMime,
    byteSize,
    checksumSha256: calculateChecksum(buffer)
  };
}

/**
 * Validate private PDF upload
 */
export function validatePdfUpload(buffer: Buffer, originalFilename: string): FileValidationResult {
  const byteSize = buffer.length;
  if (byteSize === 0) {
    return { isValid: false, error: 'PDF file is empty.' };
  }
  if (byteSize > STORAGE_LIMITS.PDF_MAX_BYTES) {
    return { isValid: false, error: `PDF exceeds maximum size of 100MB (actual: ${(byteSize / (1024 * 1024)).toFixed(2)}MB).` };
  }

  const detectedMime = detectFileSignature(buffer);
  if (detectedMime !== 'application/pdf') {
    return {
      isValid: false,
      error: 'Invalid file signature. The uploaded file is not a valid PDF document.'
    };
  }

  return {
    isValid: true,
    verifiedMimeType: 'application/pdf',
    byteSize,
    checksumSha256: calculateChecksum(buffer)
  };
}

/**
 * Generate sanitized, collision-resistant storage path
 */
export function generateSafeStoragePath(options: {
  kind: 'cover' | 'pdf' | 'resource';
  bookId: string;
  editionId?: string;
  originalFilename: string;
}): string {
  const timestamp = Date.now();
  // Strip directory paths first (both / and \)
  const rawBaseName = options.originalFilename.split(/[/\\]/).pop() || 'file';
  // Remove any remaining dot sequences (e.g. ..) and non-alphanumeric except single dot and dash
  const safeBase = rawBaseName
    .replace(/\.+/g, '.')
    .replace(/^\.+/, '')
    .replace(/[^\w.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(-40) || 'file';

  if (options.kind === 'cover') {
    return `covers/${options.bookId}/${timestamp}-${safeBase}`;
  }

  if (options.kind === 'pdf') {
    const editionPart = options.editionId || 'default';
    return `editions/${editionPart}/${timestamp}-${safeBase}`;
  }

  return `resources/${options.bookId}/${timestamp}-${safeBase}`;
}
