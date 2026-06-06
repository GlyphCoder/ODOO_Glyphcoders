/**
 * One-shot migration: adds 'withdrawn' to the quot_status enum
 * Run: node migrate-add-withdrawn.mjs
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Supabase doesn't expose ALTER TYPE via the JS client directly.
// Use pg_catalog workaround: insert into pg_enum using an RPC or check
// if the value already exists first.
const { data, error } = await supabase.rpc('pg_catalog_add_enum_value', {
  type_name: 'quot_status',
  enum_value: 'withdrawn',
}).catch(() => ({ data: null, error: { message: 'RPC not available' } }));

if (error) {
  console.log('RPC method not available — you need to run this SQL manually in Supabase SQL Editor:');
  console.log('');
  console.log("  ALTER TYPE quot_status ADD VALUE IF NOT EXISTS 'withdrawn';");
  console.log('');
  console.log('Go to: https://supabase.com/dashboard/project/hnvlxfrdtzeknbxtlzqt/sql/new');
} else {
  console.log('✅ Successfully added withdrawn to quot_status enum', data);
}
