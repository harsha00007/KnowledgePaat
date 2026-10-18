import '../utils/supabase/dnsPin';
(globalThis as any).WebSocket = class MockWebSocket {};
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase configuration in frontend/.env.local');
  process.exit(1);
}

// Strict Safety Guard: Block production project mutations
if (url.includes('csjywuflkvohytbvglxf')) {
  console.error('CRITICAL: Production Supabase project detected. Refusing to operate.');
  process.exit(1);
}

const client = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Accounts to provision with clean credentials
const ACCOUNTS = [
  {
    email: 'admin@knowledgepaat.com',
    password: 'AdminPassword@2026!',
    role: 'admin',
    fullName: 'System Administrator',
  },
  {
    email: 'admin@knowledgepaat.test',
    password: 'AdminPassword@2026!',
    role: 'admin',
    fullName: 'System Administrator',
  },
  {
    email: 'student@knowledgepaat.com',
    password: 'StudentPassword@2026!',
    role: 'student',
    fullName: 'Test Student',
  },
  {
    email: 'student@knowledgepaat.test',
    password: 'StudentPassword@2026!',
    role: 'student',
    fullName: 'Test Student',
  },
];

async function ensureUser(account: typeof ACCOUNTS[0]) {
  console.log(`\n--- Provisioning ${account.role.toUpperCase()}: ${account.email} ---`);

  // 1. Check if user exists in auth.users
  const { data: usersData, error: listErr } = await client.auth.admin.listUsers();
  if (listErr) {
    throw new Error(`Failed to list users: ${listErr.message}`);
  }

  let user = usersData.users.find(
    (u) => u.email?.toLowerCase() === account.email.toLowerCase()
  );

  if (user) {
    console.log(`User exists in Supabase Auth (id: ${user.id}). Updating password and confirming email...`);
    const { data: updated, error: updateErr } = await client.auth.admin.updateUserById(
      user.id,
      {
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      }
    );
    if (updateErr) {
      throw new Error(`Failed to update user ${account.email}: ${updateErr.message}`);
    }
    user = updated.user;
  } else {
    console.log(`Creating new user in Supabase Auth...`);
    const { data: created, error: createErr } = await client.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    });
    if (createErr) {
      throw new Error(`Failed to create user ${account.email}: ${createErr.message}`);
    }
    user = created.user;
  }

  if (!user) {
    throw new Error(`Could not obtain user for ${account.email}`);
  }

  // 2. Ensure profile exists and has the designated role
  const { data: existingProfile } = await client
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    const { error: profUpdateErr } = await client
      .from('profiles')
      .update({
        role: account.role,
        full_name: account.fullName,
        is_active: true,
      })
      .eq('id', user.id);

    if (profUpdateErr) {
      throw new Error(`Failed to update profile for ${account.email}: ${profUpdateErr.message}`);
    }
    console.log(`Profile updated: role = '${account.role}'`);
  } else {
    const { error: profInsertErr } = await client.from('profiles').insert({
      id: user.id,
      user_id: user.id,
      email: account.email,
      full_name: account.fullName,
      role: account.role,
      is_active: true,
    });

    if (profInsertErr) {
      throw new Error(`Failed to insert profile for ${account.email}: ${profInsertErr.message}`);
    }
    console.log(`Profile inserted: role = '${account.role}'`);
  }

  // 3. If student, grant an entitlement to sample book for immediate testing
  if (account.role === 'student') {
    const { data: sampleBook } = await client
      .from('ebooks')
      .select('id, title')
      .eq('slug', 'mastering-microservices-architecture')
      .maybeSingle();

    if (sampleBook) {
      const { data: edition } = await client
        .from('ebook_editions')
        .select('id')
        .eq('ebook_id', sampleBook.id)
        .eq('status', 'published')
        .order('edition_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: existingEnt } = await client
        .from('ebook_entitlements')
        .select('id')
        .eq('customer_id', user.id)
        .eq('ebook_id', sampleBook.id)
        .maybeSingle();

      if (!existingEnt) {
        const { error: entErr } = await client.from('ebook_entitlements').insert({
          customer_id: user.id,
          ebook_id: sampleBook.id,
          edition_id: edition?.id || null,
          plan: 'read_download',
          can_read_online: true,
          can_download_pdf: true,
          grant_type: 'complimentary',
          grant_reason: 'Staging test account pre-provisioned access',
          is_active: true,
        });

        if (entErr) {
          console.warn(`Could not seed entitlement for ${account.email}:`, entErr.message);
        } else {
          console.log(`Granted pre-activated 'read_download' entitlement to '${sampleBook.title}'`);
        }
      } else {
        await client
          .from('ebook_entitlements')
          .update({
            plan: 'read_download',
            can_read_online: true,
            can_download_pdf: true,
            is_active: true,
          })
          .eq('id', existingEnt.id);
        console.log(`Updated pre-existing entitlement to active 'read_download' access`);
      }
    }
  }

  // 4. Verify password login via Supabase Auth
  const anonKey = envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  if (anonKey) {
    const authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (signInErr) {
      throw new Error(`Login verification FAILED for ${account.email}: ${signInErr.message}`);
    }
    console.log(`Login verification PASSED: authenticated as ${signInData.user?.id}`);
  }

  return { email: account.email, password: account.password, role: account.role, id: user.id };
}

async function main() {
  console.log('Target Supabase Project:', url);
  const results = [];
  for (const acc of ACCOUNTS) {
    const res = await ensureUser(acc);
    results.push(res);
  }

  console.log('\n======================================================');
  console.log('PROVISIONING COMPLETE - TEST ACCOUNTS READY:');
  console.log('======================================================');
  for (const r of results) {
    console.log(`[${r.role.toUpperCase()}] ${r.email} | Password: ${r.password}`);
  }
  console.log('======================================================');
}

main().catch((err) => {
  console.error('PROVISIONING SCRIPT ERROR:', err);
  process.exit(1);
});
