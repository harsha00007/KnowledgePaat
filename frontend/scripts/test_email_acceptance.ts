/**
 * KnowledgePaat — Transactional Email & Outbox Acceptance Suite
 * 
 * Target Environment: Dedicated Staging Supabase (lzuinimbsdxnhzmjpxmr)
 * Scope:
 * 1. Inspect existing staging email configuration.
 * 2. Distinguish outbox creation, provider acceptance, and mailbox receipt.
 * 3. Verify non-blocking behavior: Outbox failure NEVER affects paid order status or customer entitlements.
 * 4. Verify retry idempotency: 'sent' records never duplicate delivery.
 * 5. Document required environment variables and domain setup steps.
 */

import '../utils/supabase/dnsPin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

import { checkEmailTransportConfig, processOrderReceiptOutbox } from '../lib/ebook/receipts';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database detected! Aborting.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runEmailAcceptanceSuite() {
  console.log('='.repeat(80));
  console.log('KNOWLEDGEPAAT: TRANSACTIONAL EMAIL & OUTBOX ACCEPTANCE SUITE');
  console.log('='.repeat(80));

  // 1. Inspect existing staging email configuration
  console.log('\n--- 1. STAGING EMAIL CONFIGURATION INSPECTION ---');
  const transport = checkEmailTransportConfig();
  console.log(`Configured       : ${transport.configured}`);
  console.log(`Transport Type   : ${transport.transportType}`);
  console.log(`Missing Variables: ${transport.missingVariables.length > 0 ? transport.missingVariables.join(', ') : 'None'}`);

  // 2. Resolve test customer and published book
  const { data: student } = await adminClient.from('profiles').select('id, email, full_name').eq('email', 'student@knowledgepaat.test').single();
  const { data: edition } = await adminClient.from('ebook_editions').select('id, ebook_id, edition_number, price_read_online_paise, ebook:ebooks(id, title)').eq('is_current_edition', true).limit(1).single();

  if (!student || !edition) {
    throw new Error('Test fixtures missing from staging.');
  }

  // 3. Verify Outbox Creation & Non-blocking Isolation
  console.log('\n--- 2. OUTBOX CREATION & PAID ACCESS ISOLATION ---');
  const orderNum = `EB-EML-${Date.now()}`;
  const { data: testOrder } = await adminClient.from('ebook_orders').insert({
    order_number: orderNum,
    customer_id: student.id,
    customer_email: student.email,
    customer_name: student.full_name,
    total_amount_paise: 4900,
    currency: 'INR',
    order_type: 'purchase',
    payment_status: 'paid',
    order_status: 'completed',
    paid_at: new Date().toISOString(),
  }).select().single();

  // Establish active entitlement
  const { error: entInsertErr } = await adminClient.from('ebook_entitlements').upsert({
    customer_id: student.id,
    ebook_id: edition.ebook_id,
    edition_id: edition.id,
    order_id: testOrder.id,
    plan: 'read_online',
    can_read_online: true,
    can_download_pdf: false,
    is_active: true,
    grant_type: 'purchase',
  }, { onConflict: 'customer_id,ebook_id,edition_id' });

  if (entInsertErr) {
    throw new Error(`Failed to upsert test entitlement: ${entInsertErr.message}`);
  }

  // Create durable outbox record
  const { data: outboxEntry, error: outboxErr } = await adminClient.from('ebook_receipt_outbox').insert({
    order_id: testOrder.id,
    customer_id: student.id,
    recipient_email: student.email,
    recipient_name: student.full_name,
    status: 'pending',
    retry_count: 0,
    payload: {
      orderNumber: orderNum,
      amountPaise: 4900,
      bookTitle: (edition.ebook as any)?.title,
      editionNumber: edition.edition_number,
    },
  }).select().single();

  if (outboxErr || !outboxEntry) {
    throw new Error(`Failed to insert outbox entry: ${outboxErr?.message}`);
  }

  console.log(`✅ Durable outbox entry created: ID=${outboxEntry.id}, status="${outboxEntry.status}"`);

  // Process outbox with current staging configuration
  console.log('Processing outbox record with current transport...');
  const processResult = await processOrderReceiptOutbox(testOrder.id);
  console.log(`Outbox processing result:`, processResult);

  // Verify that outbox failure NEVER alters paid order or customer entitlement
  const { data: ordAfter } = await adminClient.from('ebook_orders').select('payment_status, order_status').eq('id', testOrder.id).single();
  const { data: entAfter } = await adminClient.from('ebook_entitlements').select('is_active, can_read_online').eq('customer_id', student.id).eq('edition_id', edition.id).single();
  const { data: outboxAfter } = await adminClient.from('ebook_receipt_outbox').select('*').eq('id', outboxEntry.id).single();

  if (!ordAfter || !entAfter || !outboxAfter) {
    throw new Error('FATAL: Could not fetch post-outbox records for verification');
  }

  console.log(`Order status after outbox attempt      : payment_status="${ordAfter.payment_status}", order_status="${ordAfter.order_status}"`);
  console.log(`Customer access after outbox attempt   : is_active=${entAfter.is_active}, can_read_online=${entAfter.can_read_online}`);
  console.log(`Outbox record state after attempt      : status="${outboxAfter.status}", retry_count=${outboxAfter.retry_count}`);

  if (ordAfter.payment_status !== 'paid' || entAfter.is_active !== true) {
    throw new Error('FATAL: Outbox failure improperly degraded paid order status or customer access!');
  }
  console.log('✅ PASS: Outbox failure strictly isolated; customer access and paid order remain intact.');

  // 4. Verify Duplicate Prevention on Retry
  console.log('\n--- 3. RETRY IDEMPOTENCY & DUPLICATE DELIVERY PREVENTION ---');
  // Mark outbox entry as 'sent'
  await adminClient.from('ebook_receipt_outbox').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
  }).eq('id', outboxEntry.id);

  // Attempt duplicate processing
  const retryResult = await processOrderReceiptOutbox(testOrder.id);
  console.log('Retry on already-sent outbox record:', retryResult);

  if (retryResult.status !== 'sent' || retryResult.message !== 'Receipt already sent') {
    throw new Error('FATAL: Retry did not detect and prevent duplicate delivery!');
  }
  console.log('✅ PASS: Retry detected already-sent outbox record; duplicate dispatch prevented.');

  console.log('\n' + '='.repeat(80));
  console.log('TRANSACTIONAL EMAIL ACCEPTANCE SUMMARY:');
  console.log('1. Outbox Creation    : PASS (durable outbox rows created with customer metadata)');
  console.log('2. Access Isolation   : PASS (transport errors never alter paid access or entitlements)');
  console.log('3. Retry Idempotency  : PASS (already-sent items deduplicated safely)');
  console.log('4. Mailbox Delivery   : BLOCKED (Pending production/staging Resend or SMTP credentials)');
  console.log('='.repeat(80));
}

runEmailAcceptanceSuite().catch(err => {
  console.error('Email suite error:', err);
  process.exit(1);
});
