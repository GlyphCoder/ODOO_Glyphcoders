/**
 * VendorBridge — Demo Seed Data Script (Fixed)
 * Creates real multi-vendor quotations for open RFQs.
 *
 * quotation_items actual columns: quotation_id, product_name, quantity, unit, unit_price, notes
 * purchase_orders actual columns: uses terms_conditions (not payment_terms)
 *
 * Run: node seed-demo-data.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── UUIDs from seed.sql ──────────────────────────────────────────────────────
const VENDORS = {
  techSupplies:  '11111111-0000-0000-0000-000000000001',
  officeWorld:   '11111111-0000-0000-0000-000000000002',
  buildMart:     '11111111-0000-0000-0000-000000000003',
  cleanPro:      '11111111-0000-0000-0000-000000000004',
  safeguard:     '11111111-0000-0000-0000-000000000005',
  printXpress:   '11111111-0000-0000-0000-000000000006',
  fleetMover:    '11111111-0000-0000-0000-000000000007',
  mediSupply:    '11111111-0000-0000-0000-000000000008',
};

const RFQS = {
  furniture:  '22222222-0000-0000-0000-000000000001',
  itHardware: '22222222-0000-0000-0000-000000000002',
  cleaning:   '22222222-0000-0000-0000-000000000005',
};

const USERS = {
  admin:   'e7b7de81-8937-435d-8875-823b41598a46',
  manager: 'b4012020-f90f-4051-8e6c-729354d32051',
  officer: '6d69228e-8cd2-4bff-b186-bc412ff30fa5',
  vendor:  '20bff3c3-74f5-4d04-b24d-1de7387a3418',
};

// The demo vendor user (vendor@vendorbridge.com) should be linked to Tech Supplies
const VENDOR_USER_LINK = {
  user_id: USERS.vendor,
  vendor_id: VENDORS.techSupplies,
};

async function fixVendorUserLink() {
  console.log('🔗 Fixing vendor_users link for vendor@vendorbridge.com → Tech Supplies Pvt Ltd...');
  // Delete any existing links for this user first, then insert fresh
  await supabase.from('vendor_users').delete().eq('user_id', USERS.vendor);
  const { error } = await supabase.from('vendor_users').insert(VENDOR_USER_LINK);
  if (error) console.error('vendor_users insert error:', error.message);
  else console.log('✅ vendor_users link set.');
}

async function clearExistingDemoData() {
  console.log('🧹 Clearing existing demo quotations for target RFQs...');
  const rfqIds = Object.values(RFQS);

  // Get quotation IDs first
  const { data: existingQuots } = await supabase.from('quotations').select('id').in('rfq_id', rfqIds);
  const quotIds = (existingQuots || []).map(q => q.id);

  if (quotIds.length > 0) {
    await supabase.from('quotation_items').delete().in('quotation_id', quotIds);
  }
  await supabase.from('approvals').delete().in('rfq_id', rfqIds);
  await supabase.from('purchase_orders').delete().in('rfq_id', rfqIds);
  await supabase.from('quotations').delete().in('rfq_id', rfqIds);
  console.log('✅ Cleared.');
}

async function ensureRFQVendors() {
  console.log('📋 Ensuring vendors are invited to RFQs...');
  const invitations = [
    { rfq_id: RFQS.furniture,  vendor_id: VENDORS.techSupplies, responded: false },
    { rfq_id: RFQS.furniture,  vendor_id: VENDORS.officeWorld,  responded: false },
    { rfq_id: RFQS.furniture,  vendor_id: VENDORS.buildMart,    responded: false },
    { rfq_id: RFQS.itHardware, vendor_id: VENDORS.techSupplies, responded: false },
    { rfq_id: RFQS.itHardware, vendor_id: VENDORS.officeWorld,  responded: false },
    { rfq_id: RFQS.itHardware, vendor_id: VENDORS.mediSupply,   responded: false },
    { rfq_id: RFQS.cleaning,   vendor_id: VENDORS.cleanPro,     responded: false },
    { rfq_id: RFQS.cleaning,   vendor_id: VENDORS.safeguard,    responded: false },
  ];
  for (const inv of invitations) {
    await supabase.from('rfq_vendors').upsert(inv, { onConflict: 'rfq_id,vendor_id' });
  }
  console.log('✅ RFQ vendor invitations set.');
}

async function fetchRFQItems(rfq_id) {
  const { data } = await supabase.from('rfq_items').select('*').eq('rfq_id', rfq_id);
  return data || [];
}

async function createQuotationWithItems(rfq_id, vendor_id, itemDefs, options = {}) {
  const subtotal = itemDefs.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
  const tax_pct = 18;
  const tax_amount = (subtotal * tax_pct) / 100;
  const total_amount = subtotal + tax_amount;
  const delivery_days = Math.max(...itemDefs.map(i => i.delivery_days || 7));

  const { data: quot, error: qErr } = await supabase.from('quotations').insert({
    rfq_id,
    vendor_id,
    delivery_days,
    payment_terms: options.payment_terms || 'Net 30 days',
    validity_days: 30,
    notes: options.notes || '',
    tax_percentage: tax_pct,
    subtotal,
    tax_amount,
    total_amount,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }).select().single();

  if (qErr) { console.error('❌ Quotation insert error:', qErr.message); return null; }

  // quotation_items columns: quotation_id, product_name, quantity, unit, unit_price, notes
  const itemRows = itemDefs.map(item => ({
    quotation_id: quot.id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit: item.unit || 'Pcs',
    unit_price: item.unit_price,
    notes: `Delivery: ${item.delivery_days || delivery_days} days`,
  }));

  const { error: itemErr } = await supabase.from('quotation_items').insert(itemRows);
  if (itemErr) console.error('❌ quotation_items insert error:', itemErr.message);
  else console.log(`   ✓ ${itemDefs.length} items inserted for quotation`);

  await supabase.from('rfq_vendors').update({ responded: true })
    .eq('rfq_id', rfq_id).eq('vendor_id', vendor_id);

  return quot;
}

async function seedFurnitureRFQ() {
  console.log('\n📦 Seeding Office Furniture RFQ (3 vendors)...');
  const items = await fetchRFQItems(RFQS.furniture);
  const chair  = items.find(i => i.product_name?.includes('Chair')) || { product_name: 'Ergonomic Office Chair', quantity: 50 };
  const desk   = items.find(i => i.product_name?.includes('Desk'))  || { product_name: 'Standing Desk', quantity: 20 };
  const cab    = items.find(i => i.product_name?.includes('Cabinet'))|| { product_name: 'Storage Cabinet', quantity: 15 };

  console.log('  → Tech Supplies Pvt Ltd');
  await createQuotationWithItems(RFQS.furniture, VENDORS.techSupplies, [
    { product_name: chair.product_name, quantity: chair.quantity, unit: 'Pcs', unit_price: 4200, delivery_days: 10 },
    { product_name: desk.product_name,  quantity: desk.quantity,  unit: 'Pcs', unit_price: 18500, delivery_days: 14 },
    { product_name: cab.product_name,   quantity: cab.quantity,   unit: 'Pcs', unit_price: 6800, delivery_days: 7  },
  ], { payment_terms: 'Net 30 days', notes: 'ISO certified. Bulk discount applied.' });

  console.log('  → Office World Solutions');
  await createQuotationWithItems(RFQS.furniture, VENDORS.officeWorld, [
    { product_name: chair.product_name, quantity: chair.quantity, unit: 'Pcs', unit_price: 4800, delivery_days: 7 },
    { product_name: desk.product_name,  quantity: desk.quantity,  unit: 'Pcs', unit_price: 19200, delivery_days: 10 },
    { product_name: cab.product_name,   quantity: cab.quantity,   unit: 'Pcs', unit_price: 7200, delivery_days: 5  },
  ], { payment_terms: 'Net 15 days', notes: 'Premium quality. 1 year warranty.' });

  console.log('  → BuildMart Contractors');
  await createQuotationWithItems(RFQS.furniture, VENDORS.buildMart, [
    { product_name: chair.product_name, quantity: chair.quantity, unit: 'Pcs', unit_price: 3800, delivery_days: 18 },
    { product_name: desk.product_name,  quantity: desk.quantity,  unit: 'Pcs', unit_price: 16900, delivery_days: 21 },
    { product_name: cab.product_name,   quantity: cab.quantity,   unit: 'Pcs', unit_price: 6200, delivery_days: 14 },
  ], { payment_terms: 'Advance payment', notes: 'Standard quality. Warehouse delivery.' });
}

async function seedITHardwareRFQ() {
  console.log('\n💻 Seeding IT Hardware RFQ (3 vendors)...');
  const items = await fetchRFQItems(RFQS.itHardware);
  const laptop  = items.find(i => i.product_name?.includes('Laptop'))  || { product_name: 'Laptop', quantity: 50 };
  const monitor = items.find(i => i.product_name?.includes('Monitor')) || { product_name: 'Monitor', quantity: 50 };
  const kb      = items.find(i => i.product_name?.includes('Keyboard'))|| { product_name: 'Wireless Keyboard & Mouse', quantity: 50 };

  console.log('  → Tech Supplies Pvt Ltd');
  await createQuotationWithItems(RFQS.itHardware, VENDORS.techSupplies, [
    { product_name: laptop.product_name,  quantity: laptop.quantity,  unit: 'Pcs', unit_price: 52000, delivery_days: 12 },
    { product_name: monitor.product_name, quantity: monitor.quantity, unit: 'Pcs', unit_price: 8500,  delivery_days: 10 },
    { product_name: kb.product_name,      quantity: kb.quantity,      unit: 'Set', unit_price: 1800,  delivery_days: 7  },
  ], { payment_terms: 'Net 45 days', notes: 'Dell/HP branded. 3yr on-site warranty.' });

  console.log('  → Office World Solutions');
  await createQuotationWithItems(RFQS.itHardware, VENDORS.officeWorld, [
    { product_name: laptop.product_name,  quantity: laptop.quantity,  unit: 'Pcs', unit_price: 47500, delivery_days: 15 },
    { product_name: monitor.product_name, quantity: monitor.quantity, unit: 'Pcs', unit_price: 7800,  delivery_days: 15 },
    { product_name: kb.product_name,      quantity: kb.quantity,      unit: 'Set', unit_price: 1500,  delivery_days: 10 },
  ], { payment_terms: 'Net 30 days', notes: 'Budget range. 1yr warranty.' });

  console.log('  → MediSupply Corp');
  await createQuotationWithItems(RFQS.itHardware, VENDORS.mediSupply, [
    { product_name: laptop.product_name,  quantity: laptop.quantity,  unit: 'Pcs', unit_price: 62000, delivery_days: 7 },
    { product_name: monitor.product_name, quantity: monitor.quantity, unit: 'Pcs', unit_price: 10500, delivery_days: 7 },
    { product_name: kb.product_name,      quantity: kb.quantity,      unit: 'Set', unit_price: 2200,  delivery_days: 5 },
  ], { payment_terms: 'Net 60 days', notes: 'Premium — MacBook/LG UltraWide. AppleCare.' });
}

async function seedCleaningRFQ() {
  console.log('\n🧹 Seeding Cleaning Services RFQ (2 vendors)...');
  const items = await fetchRFQItems(RFQS.cleaning);
  const svc = items[0] || { product_name: 'Office Cleaning Service', quantity: 12 };

  console.log('  → CleanPro Services');
  await createQuotationWithItems(RFQS.cleaning, VENDORS.cleanPro, [
    { product_name: svc.product_name, quantity: svc.quantity, unit: 'Month', unit_price: 45000, delivery_days: 3 },
  ], { payment_terms: 'Monthly advance', notes: 'ISO certified. Eco-friendly products. 24/7 availability.' });

  console.log('  → SafeGuard Security');
  await createQuotationWithItems(RFQS.cleaning, VENDORS.safeguard, [
    { product_name: svc.product_name, quantity: svc.quantity, unit: 'Month', unit_price: 38500, delivery_days: 5 },
  ], { payment_terms: 'Quarterly payment', notes: 'Professional trained staff.' });
}

async function main() {
  console.log('🌱 VendorBridge Demo Data Seeder (v2 — corrected schema)');
  console.log('===========================================================');

  await fixVendorUserLink();
  await clearExistingDemoData();
  await ensureRFQVendors();
  await seedFurnitureRFQ();
  await seedITHardwareRFQ();
  await seedCleaningRFQ();

  console.log('\n✅ All demo data seeded!');
  console.log('  - Office Furniture: 3 vendors (Tech Supplies ₹8L, Office World ₹10L, BuildMart ₹7.3L)');
  console.log('  - IT Hardware:      3 vendors (Tech Supplies ₹37L, Office World ₹34L, MediSupply ₹44L)');
  console.log('  - Cleaning:         2 vendors (CleanPro ₹6.4L/yr, SafeGuard ₹5.4L/yr)');
  console.log('\n  vendor@vendorbridge.com → linked to Tech Supplies Pvt Ltd');
  console.log('  Login as vendor → see only their RFQs → submit quotations');
  console.log('  Login as officer → compare all vendors → send best for approval');
  console.log('  Login as manager → approve → PO auto-generated');
}

main().catch(console.error);
