import '../utils/supabase/dnsPin';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

// Safety guard: reject production
if (url.includes('csjywuflkvohytbvglxf')) {
  console.error('CRITICAL: Production Supabase project detected. Refusing to operate.');
  process.exit(1);
}

const client = createClient(url, serviceRoleKey);

async function rotate() {
  const email = process.env.STAGING_TEST_CUSTOMER_EMAIL || 'phase5.api.test@knowledgepaat.test';
  
  const { data: users, error: listErr } = await client.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }
  
  const user = users.users.find((u) => u.email === email);
  if (!user) {
    console.error('Test user not found:', email);
    process.exit(1);
  }

  // Generate strong rotated password
  const newPassword = 'Kp!' + crypto.randomBytes(12).toString('base64url') + '#9z';
  const { error: updateErr } = await client.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  
  if (updateErr) {
    console.error('Failed to update password:', updateErr.message);
    process.exit(1);
  }

  // Update .env.local without logging the secret
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('STAGING_TEST_CUSTOMER_PASSWORD=')) {
    envContent = envContent.replace(
      /STAGING_TEST_CUSTOMER_PASSWORD=.*/,
      'STAGING_TEST_CUSTOMER_PASSWORD=' + newPassword
    );
  } else {
    envContent = envContent.trim() + '\nSTAGING_TEST_CUSTOMER_EMAIL=' + email + '\nSTAGING_TEST_CUSTOMER_PASSWORD=' + newPassword + '\n';
  }
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log(`SUCCESS: Rotated password in Supabase Auth and updated local configuration for ${email}.`);
}

rotate().catch((err) => {
  console.error('Rotation error:', err);
  process.exit(1);
});
