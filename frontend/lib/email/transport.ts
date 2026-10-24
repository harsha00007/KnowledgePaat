/**
 * KnowledgePaat Transactional Email Transport Engine
 * 
 * Sizing & Infrastructure Specifications:
 * ---------------------------------------
 * 1. Supabase Built-in Default Auth Limit: 30 emails/hour (built-in rate ceiling).
 *    -> For production and 2,000-5,000 user workloads, Custom SMTP (or Send Email Hook) MUST be configured.
 * 2. Resend Capacity & Quotas:
 *    - Free Sandbox: 100 emails/day, 3,000/month, burst limit 2 req/sec.
 *    - Production (Resend Pro / Enterprise): 50,000 to 500,000+ emails/month, burst limit 50-100 req/sec.
 *    - Delivery rate sizing: Peak 5,000 user registrations across 30 min requires ~3-5 emails/second throughput.
 * 3. DNS Authentication Records (Production Setup):
 *    - Domain/Subdomain: mail.knowledgepaat.com
 *    - SPF:  Type TXT | Host: mail | Value: "v=spf1 include:resend.com ~all"
 *    - DKIM: Type TXT/CNAME | Host: resend._domainkey.mail | Provided by Resend dashboard
 *    - DMARC: Type TXT | Host: _dmarc.knowledgepaat.com | Value: "v=DMARC1; p=quarantine; pct=100; rua=mailto:security@knowledgepaat.com"
 */

import { logger } from '@/lib/logger';
import { EmailRenderOutput } from './templates';

export interface TransportConfigStatus {
  configured: boolean;
  transportType: 'resend' | 'smtp' | 'sandbox_mock' | 'none';
  senderAddress: string;
  senderName: string;
  missingVariables: string[];
  quotas: {
    maxDaily: number | string;
    burstPerSecond: number;
    provider: string;
  };
}

export function inspectEmailTransportConfig(): TransportConfigStatus {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const senderName = process.env.EMAIL_SENDER_NAME || 'KnowledgePaat';
  const senderAddress = process.env.EMAIL_FROM_ADDRESS || 'no-reply@knowledgepaat.com';

  if (resendApiKey && resendApiKey.trim().length > 0 && !resendApiKey.includes('placeholder')) {
    return {
      configured: true,
      transportType: 'resend',
      senderName,
      senderAddress,
      missingVariables: [],
      quotas: {
        maxDaily: '50,000+ (Resend Tier)',
        burstPerSecond: 25,
        provider: 'Resend Transactional API',
      },
    };
  }

  if (smtpHost && smtpUser && smtpPass) {
    return {
      configured: true,
      transportType: 'smtp',
      senderName,
      senderAddress,
      missingVariables: [],
      quotas: {
        maxDaily: 'Provider Defined',
        burstPerSecond: 10,
        provider: `Custom SMTP (${smtpHost})`,
      },
    };
  }

  // Simulated / Mock Sandbox mode explicitly enabled for volume tests
  if (process.env.MOCK_EMAIL_TRANSPORT === 'true') {
    return {
      configured: true,
      transportType: 'sandbox_mock',
      senderName,
      senderAddress,
      missingVariables: [],
      quotas: {
        maxDaily: 100000,
        burstPerSecond: 1000,
        provider: 'Isolated High-Throughput Test Sandbox',
      },
    };
  }

  const missing: string[] = [];
  if (!resendApiKey) missing.push('RESEND_API_KEY');
  if (!smtpHost) missing.push('SMTP_HOST');
  if (!smtpUser) missing.push('SMTP_USER');
  if (!smtpPass) missing.push('SMTP_PASS');

  return {
    configured: false,
    transportType: 'none',
    senderName,
    senderAddress,
    missingVariables: missing,
    quotas: {
      maxDaily: 0,
      burstPerSecond: 0,
      provider: 'Unconfigured / Missing Credentials',
    },
  };
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
  isTestMailbox?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  status: 'delivered' | 'accepted' | 'sandbox_simulated' | 'unconfigured_blocked' | 'failed';
  providerMessageId?: string;
  error?: string;
}

/**
 * Dispatch an outbound transactional email.
 * Strictly non-blocking: never throws unhandled errors up to caller transactions.
 */
export async function sendTransactionalEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const config = inspectEmailTransportConfig();

  // 1. High-throughput test sandbox / mock
  if (config.transportType === 'sandbox_mock' || payload.isTestMailbox || payload.to.endsWith('@knowledgepaat.test')) {
    logger.info('Email dispatched to test mailbox sandbox', {
      module: 'email_transport',
      recipient: payload.to,
      subject: payload.subject,
      sandbox: true,
    });
    return {
      success: true,
      status: 'sandbox_simulated',
      providerMessageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  // 2. Resend API Transport with stable Idempotency-Key
  if (config.transportType === 'resend') {
    try {
      const fromField = `${config.senderName} <${config.senderAddress}>`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      };
      if (payload.idempotencyKey) {
        headers['Idempotency-Key'] = payload.idempotencyKey;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: payload.from || fromField,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        logger.error('Resend API rejected email dispatch', data, { recipient: payload.to });
        return {
          success: false,
          status: 'failed',
          error: data.message || `Resend HTTP ${res.status}`,
        };
      }

      logger.info('Email accepted by Resend', { messageId: data.id, recipient: payload.to });
      return {
        success: true,
        status: 'accepted',
        providerMessageId: data.id,
      };
    } catch (err: any) {
      logger.error('Network failure connecting to Resend API', err, { recipient: payload.to });
      return {
        success: false,
        status: 'failed',
        error: err?.message || 'Network error connecting to email provider',
      };
    }
  }

  // 3. Unconfigured / Missing Credentials in Staging
  logger.warn('Outbound email transport unconfigured. Dispatch marked unconfigured_blocked.', {
    module: 'email_transport',
    recipient: payload.to,
    missing: config.missingVariables,
  });

  return {
    success: false,
    status: 'unconfigured_blocked',
    error: `Email transport unconfigured: Missing ${config.missingVariables.join(', ')}`,
  };
}
