import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface AuditLogParams {
  actorId: string | null;
  action: 
    | 'book_created'
    | 'book_updated'
    | 'book_archived'
    | 'edition_created'
    | 'edition_updated'
    | 'edition_published'
    | 'edition_deleted'
    | 'chapter_created'
    | 'chapter_updated'
    | 'chapter_reordered'
    | 'chapter_deleted'
    | 'asset_uploaded'
    | 'asset_deleted';
  entityType: 'ebook' | 'edition' | 'chapter' | 'asset';
  entityId: string;
  metadata?: Record<string, any>;
}

/**
 * Record administrator mutation event in ebook_audit_logs table.
 * Strips secrets, tokens, or signed URLs automatically.
 */
export async function logAdminAuditEvent(
  supabase: SupabaseClient,
  params: AuditLogParams
): Promise<void> {
  try {
    // Sanitize metadata: redact any potential secrets or signed URLs
    const sanitizedMeta: Record<string, any> = {};
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        if (/token|secret|key|sig|url/i.test(key) && typeof value === 'string' && value.length > 50) {
          sanitizedMeta[key] = '[REDACTED_SENSITIVE_STRING]';
        } else {
          sanitizedMeta[key] = value;
        }
      }
    }

    const { error } = await supabase
      .from('ebook_audit_logs')
      .insert({
        actor_id: params.actorId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        metadata: sanitizedMeta,
        created_at: new Date().toISOString()
      });

    if (error) {
      logger.warn('Failed to persist audit log row to database (non-blocking)', {
        module: 'ebook_audit',
        action: params.action,
        entityId: params.entityId,
        error: error.message
      });
    } else {
      logger.info(`Audit log recorded: ${params.action} on ${params.entityType}:${params.entityId}`, {
        module: 'ebook_audit',
        actorId: params.actorId,
        action: params.action,
        entityId: params.entityId
      });
    }
  } catch (err) {
    logger.error('Unhandled exception while writing audit log', err, {
      module: 'ebook_audit',
      action: params.action,
      entityId: params.entityId
    });
  }
}
