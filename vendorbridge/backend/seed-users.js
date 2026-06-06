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

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || 'Demo@12345';

const DEMO_USERS = [
  {
    email: 'admin@vendorbridge.com',
    password: DEFAULT_PASSWORD,
    full_name: 'Arjun Mehta',
    role: 'admin',
  },
  {
    email: 'manager@vendorbridge.com',
    password: DEFAULT_PASSWORD,
    full_name: 'Priya Sharma',
    role: 'manager',
  },
  {
    email: 'officer@vendorbridge.com',
    password: DEFAULT_PASSWORD,
    full_name: 'Rohan Verma',
    role: 'procurement_officer',
  },
];

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');

const vendorFallbackEmail = (vendor) => {
  const suffix = vendor.id?.split('-').at(-1) || crypto.randomUUID();
  return `vendor-${suffix}@vendorbridge.test`;
};

async function upsertProfile(userId, user) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone || null,
    }, { onConflict: 'id' });
  if (error) throw error;
}

async function loadAuthUsersByEmail() {
  const usersByEmail = new Map();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    users.forEach(user => {
      if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
    });

    if (users.length < perPage) break;
    page += 1;
  }

  return usersByEmail;
}

async function ensureUser(user, usersByEmail) {
  const email = user.email.toLowerCase();
  const existingUser = usersByEmail.get(email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: user.password,
      user_metadata: { full_name: user.full_name },
    });
    if (error) throw error;

    usersByEmail.set(email, data.user);

    await upsertProfile(existingUser.id, user);

    return { userId: existingUser.id, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });
  if (error) throw error;

  usersByEmail.set(email, data.user);

  await upsertProfile(data.user.id, user);

  return { userId: data.user.id, created: true };
}

async function ensureVendorLink(userId, vendorId) {
  const { data: existingForVendor, error: vendorLookupError } = await supabase
    .from('vendor_users')
    .select('id, user_id, vendor_id')
    .eq('vendor_id', vendorId)
    .maybeSingle();
  if (vendorLookupError) throw vendorLookupError;

  if (existingForVendor) {
    if (existingForVendor.user_id === userId) return 'existing';

    const { error } = await supabase
      .from('vendor_users')
      .update({ user_id: userId })
      .eq('id', existingForVendor.id);
    if (error) throw error;
    return 'updated';
  }

  const { data: existingForUser, error: userLookupError } = await supabase
    .from('vendor_users')
    .select('id, user_id, vendor_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (userLookupError) throw userLookupError;

  if (existingForUser) {
    const { error } = await supabase
      .from('vendor_users')
      .update({ vendor_id: vendorId })
      .eq('id', existingForUser.id);
    if (error) throw error;
    return 'updated';
  }

  const { error } = await supabase
    .from('vendor_users')
    .insert({ user_id: userId, vendor_id: vendorId });
  if (error) throw error;

  return 'created';
}

async function seedUsers() {
  console.log('🌱 Creating demo users...\n');

  const usersByEmail = await loadAuthUsersByEmail();

  for (const user of DEMO_USERS) {
    try {
      const result = await ensureUser(user, usersByEmail);
      console.log(`${result.created ? '✅  Created' : '🔁  Updated'}: ${user.full_name} <${user.email}> [${user.role}]`);
    } catch (err) {
      console.error(`❌  Failed for ${user.email}:`, err.message, JSON.stringify(err));
    }
  }

  console.log('\n🏢 Creating vendor users and links...\n');

  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id, company_name, email, phone, contact_person, contact_phone')
    .order('company_name');
  if (vendorsError) throw vendorsError;

  const vendorCredentials = [];

  for (const vendor of vendors || []) {
    const email = isEmail(vendor.email) ? vendor.email : vendorFallbackEmail(vendor);
    const fullName = vendor.contact_person || vendor.company_name;
    const user = {
      email,
      password: DEFAULT_PASSWORD,
      full_name: fullName,
      role: 'vendor',
      phone: vendor.contact_phone || vendor.phone,
    };

    try {
      const result = await ensureUser(user, usersByEmail);
      const linkStatus = await ensureVendorLink(result.userId, vendor.id);
      vendorCredentials.push({ company: vendor.company_name, email });

      console.log(
        `${result.created ? '✅  Created' : '🔁  Updated'}: ${vendor.company_name} ` +
        `<${email}> [vendor] — link ${linkStatus}`
      );
    } catch (err) {
      console.error(`❌  Failed for vendor ${vendor.company_name}:`, err.message, JSON.stringify(err));
    }
  }

  console.log('\n✨ Done! All demo accounts ready.');
  console.log('\n📋 Demo Credentials:');
  console.log('-------------------------------------------');
  DEMO_USERS.forEach(u => {
    console.log(`  [${u.role.padEnd(20)}]  ${u.email}`);
  });
  vendorCredentials.forEach(v => {
    console.log(`  [${'vendor'.padEnd(20)}]  ${v.email} (${v.company})`);
  });
  console.log(`  ${'Password (all):'.padEnd(22)} ${DEFAULT_PASSWORD}`);
  console.log('-------------------------------------------\n');
}

seedUsers();
