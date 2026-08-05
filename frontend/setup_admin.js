const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const jwtSecret = "EFBJ6J6ZikTOgJGI0pYtO2QgnFY4R3/Rn6UYRR7PgFicJ7NINvkMEdOaigoY9NDZqvW39p4+6uQx/Sg+7W8Eyg==";

if (!supabaseUrl) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const payload = {
  "role": "service_role",
  "iss": "supabase",
  "iat": Math.floor(Date.now() / 1000),
  "exp": Math.floor(Date.now() / 1000) + (60 * 60),
  "ref": "csjywuflkvohytbvglxf"
};

const serviceKey = jwt.sign(payload, jwtSecret);
const adminSupabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdmin() {
  const email = 'harshal.782002@gmail.com';
  const password = 'Admin@123';

  console.log(`Configuring admin account: ${email}`);

  // Fetch or create user
  let { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError);
    process.exit(1);
  }

  let user = users.users.find(u => u.email === email);

  if (!user) {
    console.log("User not found, creating via admin API...");
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Harsha' }
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      process.exit(1);
    }
    user = newUser.user;
    console.log("User created.");
  } else {
    console.log("User already exists. Updating password...");
    await adminSupabase.auth.admin.updateUserById(user.id, { password });
  }

  // Wait a moment for triggers
  await new Promise(r => setTimeout(r, 1000));

  console.log(`Updating profile for user ID: ${user.id} to role = admin`);

  const { error: updateError } = await adminSupabase
    .from('profiles')
    .update({ 
      role: 'admin'
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError.message);
    process.exit(1);
  }

  console.log('Successfully configured administrator account! Bypassed RLS with Service Role.');
}

setupAdmin();
