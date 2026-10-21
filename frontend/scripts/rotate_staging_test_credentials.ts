/**
 * KnowledgePaat — Staging Test Credential Rotation & Session Invalidation
 * 
 * Target: Staging Supabase (lzuinimbsdxnhzmjpxmr) ONLY.
 * Blocks any execution against production (csjywuflkvohytbvglxf).
 * 
 * Rotates compromised fixture passwords passed in URLs, writes new random
 * credentials to .env.local, invalidates sessions, and confirms previous
 * credentials are completely rejected.
 */

import '../utils/supabase/dnsPin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (supabaseUrl.includes('csjywuflkvohytbvglxf')) {
  console.error('FATAL: Production database detected. Aborting credential rotation.');
  process.exit(1);
}

if (!supabaseUrl.includes('lzuinimbsdxnhzmjpxmr')) {
  console.error('FATAL: Not connected to dedicated staging Supabase (lzuinimbsdxnhzmjpxmr). Aborting.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateSecurePassword(): string {
  // Generates 32 characters of high-entropy base64url + symbols
  return crypto.randomBytes(24).toString('base64url') + '!Kp1A';
}

function updateEnvFile(key: string, value: string) {
  let content = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

async function runRotation() {
  console.log('='.repeat(70));
  console.log('STAGING TEST CREDENTIAL ROTATION & SESSION INVALIDATION');
  console.log('='.repeat(70));
  console.log(`Target Database: ${supabaseUrl}`);

  const targets = [
    { email: 'admin@knowledgepaat.test', envKey: 'STAGING_TEST_ADMIN_PASSWORD', oldPassword: 'AdminPassword@2026!' },
    { email: 'student@knowledgepaat.test', envKey: 'STAGING_TEST_STUDENT_PASSWORD', oldPassword: 'StudentPassword@2026!' },
  ];

  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr || !users) {
    throw new Error(`Failed to list users: ${listErr?.message}`);
  }

  for (const target of targets) {
    console.log(`\nProcessing target: ${target.email}`);
    const user = users.find(u => u.email === target.email);
    if (!user) {
      console.warn(`[WARN] User ${target.email} not found in staging database.`);
      continue;
    }

    const newPassword = generateSecurePassword();

    // 1. Update password in Supabase Auth (this invalidates active refresh tokens)
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateErr) {
      throw new Error(`Failed to update password for ${target.email}: ${updateErr.message}`);
    }
    console.log(`✅ Staging credentials rotated for user ID: ${user.id}`);

    // 2. Save new secret into .env.local without logging it
    updateEnvFile(target.envKey, newPassword);
    console.log(`✅ Saved new secret to .env.local under key: ${target.envKey}`);

    // 3. Verify old compromised password FAILS
    const { error: oldAuthErr } = await adminClient.auth.signInWithPassword({
      email: target.email,
      password: target.oldPassword,
    });
    if (!oldAuthErr) {
      throw new Error(`CRITICAL: Old password still accepted for ${target.email}!`);
    }
    console.log(`✅ Verified previous credential rejection: "${oldAuthErr.message}"`);

    // 4. Verify newly generated credential SUCCEEDS
    const { data: newAuthData, error: newAuthErr } = await adminClient.auth.signInWithPassword({
      email: target.email,
      password: newPassword,
    });
    if (newAuthErr || !newAuthData.session) {
      throw new Error(`Verification of new password failed: ${newAuthErr?.message}`);
    }
    console.log(`✅ Verified new credential authenticity for user ID: ${newAuthData.user.id}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ALL TARGET STAGING CREDENTIALS SUCCESSFULLY ROTATED & VERIFIED');
  console.log('='.repeat(70));
}

runRotation().catch(err => {
  console.error('Fatal rotation error:', err);
  process.exit(1);
});
