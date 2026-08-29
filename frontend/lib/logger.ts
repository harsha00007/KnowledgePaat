/**
 * KnowledgePaat Production Structured Logger & Error Telemetry
 * Production-safe logger with automatic PII & secret scrubbing, slow request profiling,
 * and error boundary integration.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  module?: string;
  route?: string;
  action?: string;
  userId?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: any;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'credit_card',
  'cardnumber',
  'cvv',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'service_role',
  'jwt_secret',
]);

/**
 * Recursively scrub sensitive keys and PII from log payloads
 */
export function scrubSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(scrubSensitiveData);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password')) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = scrubSensitiveData(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Format and emit structured JSON log entries
 */
function emitLog(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown) {
  const timestamp = new Date().toISOString();
  const safeContext = context ? scrubSensitiveData(context) : {};

  let serializedError: any = undefined;
  if (error instanceof Error) {
    serializedError = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  } else if (error) {
    serializedError = { message: String(error) };
  }

  const logPayload = {
    timestamp,
    level,
    message,
    ...safeContext,
    ...(serializedError ? { error: serializedError } : {}),
  };

  const isProduction = process.env.NODE_ENV === 'production';

  switch (level) {
    case 'DEBUG':
      if (!isProduction) console.debug(`[DEBUG] ${message}`, safeContext);
      break;
    case 'INFO':
      if (isProduction) {
        console.log(JSON.stringify(logPayload));
      } else {
        console.log(`[INFO] ${message}`, safeContext);
      }
      break;
    case 'WARN':
      if (isProduction) {
        console.warn(JSON.stringify(logPayload));
      } else {
        console.warn(`[WARN] ${message}`, safeContext);
      }
      break;
    case 'ERROR':
      if (isProduction) {
        console.error(JSON.stringify(logPayload));
      } else {
        console.error(`[ERROR] ${message}`, serializedError || '', safeContext);
      }
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emitLog('DEBUG', message, context),
  info: (message: string, context?: LogContext) => emitLog('INFO', message, context),
  warn: (message: string, context?: LogContext) => emitLog('WARN', message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => emitLog('ERROR', message, context, error),

  /**
   * Measure execution duration and automatically flag slow operations (> threshold)
   */
  measureDuration: async <T>(
    operationName: string,
    fn: () => Promise<T>,
    slowThresholdMs = 1000,
    context?: LogContext
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;

      if (durationMs > slowThresholdMs) {
        logger.warn(`[SLOW OPERATION] ${operationName} took ${durationMs}ms`, {
          ...context,
          operationName,
          durationMs,
          thresholdMs: slowThresholdMs,
        });
      }

      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      logger.error(`[OPERATION FAILED] ${operationName} failed after ${durationMs}ms`, err, {
        ...context,
        operationName,
        durationMs,
      });
      throw err;
    }
  },
};
