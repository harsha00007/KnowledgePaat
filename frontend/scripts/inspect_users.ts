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
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

if (url.includes('csjywuflkvohytbvglxf')) {
  console.error('CRITICAL: Production Supabase project detected. Refusing to operate.');
  process.exit(1);
}

const client = createClient(url, serviceRoleKey);

async function main() {
  const { data: usersData, error: listErr } = await client.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listErr) {
    console.error('Error listing users:', listErr.message);
    process.exit(1);
  }

  console.log(`Found ${usersData.users.length} users in auth:`);
  for (const u of usersData.users) {
    const { data: profile } = await client
      .from('profiles')
      .select('id, email, role, full_name, is_active')
      .eq('id', u.id)
      .maybeSingle();

    console.log(`- ID: ${u.id} | Email: ${u.email} | Confirmed: ${Boolean(u.email_confirmed_at)} | Profile Role: ${profile?.role || 'NONE'}`);
  }
}

main().catch(console.error);
