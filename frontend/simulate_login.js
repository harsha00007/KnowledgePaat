const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testClientLogin() {
  const email = 'harshal.782002@gmail.com';
  const password = 'Admin@123';

  console.log('Signing in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error.message);
    return;
  }

  console.log('Signed in. User ID:', data.user.id);

  console.log('Fetching profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
  } else {
    console.log('Profile fetched:', profile);
    console.log('Role:', profile.role || 'student');
  }
}

testClientLogin();
