// VendorBridge — Create Mock Demo Users
// Run: node seed-users.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend .env

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

const DEMO_USERS = [
  {
    email: 'admin@vendorbridge.com',
    password: 'Demo@12345',
    full_name: 'Arjun Mehta',
    role: 'admin',
  },
  {
    email: 'manager@vendorbridge.com',
    password: 'Demo@12345',
    full_name: 'Priya Sharma',
    role: 'manager',
  },
  {
    email: 'officer@vendorbridge.com',
    password: 'Demo@12345',
    full_name: 'Rohan Verma',
    role: 'procurement_officer',
  },
  {
    email: 'vendor@vendorbridge.com',
    password: 'Demo@12345',
    full_name: 'Suresh Patel',
    role: 'vendor',
  },
];

async function seedUsers() {
  console.log('🌱 Creating demo users...\n');

  for (const user of DEMO_USERS) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name },
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`⚠️  ${user.email} already exists — skipping`);
          continue;
        }
        throw authError;
      }

      const userId = authData.user.id;

      // Update profile role (trigger creates profile, we update the role)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: user.role, full_name: user.full_name })
        .eq('id', userId);

      if (profileError) throw profileError;

      console.log(`✅  Created: ${user.full_name} <${user.email}> [${user.role}]`);
    } catch (err) {
      console.error(`❌  Failed for ${user.email}:`, err.message, JSON.stringify(err));
    }
  }

  console.log('\n✨ Done! All demo accounts ready.');
  console.log('\n📋 Demo Credentials:');
  console.log('-------------------------------------------');
  DEMO_USERS.forEach(u => {
    console.log(`  [${u.role.padEnd(20)}]  ${u.email}`);
  });
  console.log(`  ${'Password (all):'.padEnd(22)} Demo@12345`);
  console.log('-------------------------------------------\n');
}

seedUsers();
