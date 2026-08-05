const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const jwtSecret = "EFBJ6J6ZikTOgJGI0pYtO2QgnFY4R3/Rn6UYRR7PgFicJ7NINvkMEdOaigoY9NDZqvW39p4+6uQx/Sg+7W8Eyg==";

const payload = {
  "role": "service_role",
  "iss": "supabase",
  "iat": Math.floor(Date.now() / 1000),
  "exp": Math.floor(Date.now() / 1000) + (60 * 60)
};

const serviceKey = jwt.sign(payload, jwtSecret);
const adminSupabase = createClient(supabaseUrl, serviceKey);

async function checkRole() {
  const email = 'harshal.782002@gmail.com';
  
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
