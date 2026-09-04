const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.SUPABASE_JWT_SECRET;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  process.exit(1);
}

let serviceKey = supabaseServiceRoleKey;
if (!serviceKey && jwtSecret) {
  const payload = {
    "role": "service_role",
    "iss": "supabase",
    "iat": Math.floor(Date.now() / 1000),
    "exp": Math.floor(Date.now() / 1000) + (60 * 60)
  };
  serviceKey = jwt.sign(payload, jwtSecret);
}

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_JWT_SECRET environment variable.');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, serviceKey);

async function checkRole() {
  const email = process.env.CHECK_EMAIL || process.env.ADMIN_EMAIL;
  if (!email) {
    console.error('Usage: Set CHECK_EMAIL environment variable.');
    process.exit(1);
  }
  
  // 1. Get User from Auth
  const { data: usersData, error: userError } = await adminSupabase.auth.admin.listUsers();
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }
  
  const user = usersData.users.find(u => u.email === email);
  if (!user) {
    console.log('User not found in auth.');
    return;
  }
  
  console.log(`User found in Auth: ID = ${user.id}`);
  
  // 2. Fetch from Profiles
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (profileError) {
    console.error('Error fetching profile:', profileError);
  } else {
    console.log('Profile found:', profile);
    console.log('Role is:', profile.role);
  }
}

checkRole();
