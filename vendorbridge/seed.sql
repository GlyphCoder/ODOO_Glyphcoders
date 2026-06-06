-- ============================================================
-- VendorBridge — Complete Mock Seed Data
-- ============================================================
-- Covers all 4 user roles:
--   admin              → Arjun Mehta
--   manager            → Priya Sharma
--   procurement_officer → Rohan Verma
--   vendor             → Suresh Patel (linked to vendor record)
--
-- HOW TO USE:
--   Step 1: Run `node seed-users.js` from the backend/ directory.
--           This creates the 4 auth users in Supabase Auth and
--           updates their profiles with the correct roles.
--
--   Step 2: Copy the 4 user UUIDs printed by the script, then
--           replace the placeholders below:
--             e7b7de81-8937-435d-8875-823b41598a46            → admin@vendorbridge.com UUID
--             b4012020-f90f-4051-8e6c-729354d32051          → manager@vendorbridge.com UUID
--             6d69228e-8cd2-4bff-b186-bc412ff30fa5          → officer@vendorbridge.com UUID
--             20bff3c3-74f5-4d04-b24d-1de7387a3418           → vendor@vendorbridge.com UUID
--
--   Step 3: Run this file in Supabase SQL Editor.
--
-- ============================================================
-- QUICK REPLACE GUIDE (search & replace in your editor):
--   e7b7de81-8937-435d-8875-823b41598a46   = UUID of admin@vendorbridge.com
--   b4012020-f90f-4051-8e6c-729354d32051 = UUID of manager@vendorbridge.com
--   6d69228e-8cd2-4bff-b186-bc412ff30fa5 = UUID of officer@vendorbridge.com
--   20bff3c3-74f5-4d04-b24d-1de7387a3418  = UUID of vendor@vendorbridge.com
-- ============================================================


-- ============================================================
-- PROFILES (upsert — trigger already created rows on signup)
-- ============================================================
-- These rows are created automatically by Supabase trigger on auth.users.
-- We upsert here to ensure role & full_name are correct even if
-- seed-users.js was run previously.

INSERT INTO profiles (id, email, full_name, role, phone) VALUES
  ('e7b7de81-8937-435d-8875-823b41598a46',   'admin@vendorbridge.com',   'Arjun Mehta',  'admin',               '+91-9900001111'),
  ('b4012020-f90f-4051-8e6c-729354d32051',   'manager@vendorbridge.com', 'Priya Sharma', 'manager',             '+91-9900002222'),
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5',   'officer@vendorbridge.com', 'Rohan Verma',  'procurement_officer', '+91-9900003333'),
  ('20bff3c3-74f5-4d04-b24d-1de7387a3418',   'vendor@vendorbridge.com',  'Suresh Patel', 'vendor',              '+91-9900004444')
ON CONFLICT (id) DO UPDATE
  SET email     = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role      = EXCLUDED.role,
      phone     = EXCLUDED.phone;


-- ============================================================
-- VENDORS (10 sample vendors)
-- The vendor user (20bff3c3-74f5-4d04-b24d-1de7387a3418) is linked to the first entry.
-- ============================================================
INSERT INTO vendors (id, company_name, category, gst_number, pan_number, email, phone, address, city, state, pincode, contact_person, contact_phone, status, rating, total_orders, created_by) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Tech Supplies Pvt Ltd',     'IT & Electronics',          '27AABCT3518Q1ZS', 'AABCT3518Q', 'procurement@techsupplies.in', '9876543210', '45 Andheri East',      'Mumbai',    'Maharashtra',  '400069', 'Suresh Patel',  '9900004444', 'active',   4.5, 12, 'e7b7de81-8937-435d-8875-823b41598a46'),
  ('11111111-0000-0000-0000-000000000002', 'Office World Solutions',     'Office Supplies',           '29AABCO4321R1ZT', 'AABCO4321R', 'sales@officeworld.co.in',     '8765432109', '12 Koramangala',       'Bangalore', 'Karnataka',    '560034', 'Priya Sharma',  '8765432110', 'active',   4.2,  8, 'b4012020-f90f-4051-8e6c-729354d32051'),
  ('11111111-0000-0000-0000-000000000003', 'BuildMart Contractors',      'Construction & Civil',      '06AABCB5678S1ZU', 'AABCB5678S', 'info@buildmart.in',           '7654321098', '88 Sector 18',         'Noida',     'Uttar Pradesh','201301', 'Amit Singh',    '7654321099', 'active',   3.8,  5, '6d69228e-8cd2-4bff-b186-bc412ff30fa5'),
  ('11111111-0000-0000-0000-000000000004', 'CleanPro Services',          'Facilities Management',     '33AABCC9012T1ZV', 'AABCC9012T', 'contact@cleanpro.in',         '6543210987', '22 Anna Salai',        'Chennai',   'Tamil Nadu',   '600002', 'Lakshmi R',     '6543210988', 'active',   4.7, 20, 'b4012020-f90f-4051-8e6c-729354d32051'),
  ('11111111-0000-0000-0000-000000000005', 'SafeGuard Security',         'Security Services',         '08AABCS3456U1ZW', 'AABCS3456U', 'ops@safeguard.in',            '9988776655', '5 MG Road',            'Pune',      'Maharashtra',  '411001', 'Rohan Desai',   '9988776656', 'active',   4.0,  3, '6d69228e-8cd2-4bff-b186-bc412ff30fa5'),
  ('11111111-0000-0000-0000-000000000006', 'PrintXpress India',          'Printing & Stationery',     '24AABCP7890V1ZX', 'AABCP7890V', 'orders@printxpress.in',       '9871234560', '7 Industrial Area',    'Ahmedabad', 'Gujarat',      '380015', 'Mehul Patel',   '9871234561', 'active',   3.9,  7, '6d69228e-8cd2-4bff-b186-bc412ff30fa5'),
  ('11111111-0000-0000-0000-000000000007', 'FleetMover Logistics',       'Logistics & Transport',     '36AABCF2345W1ZY', 'AABCF2345W', 'dispatch@fleetmover.in',      '8899001122', '99 NH-44 Road',        'Hyderabad', 'Telangana',    '500003', 'Venkat Reddy',  '8899001123', 'inactive', 3.2,  2, 'e7b7de81-8937-435d-8875-823b41598a46'),
  ('11111111-0000-0000-0000-000000000008', 'MediSupply Corp',            'Medical & Healthcare',      '07AABCM6789X1ZZ', 'AABCM6789X', 'supply@medisupply.in',        '9900112233', '14 DLF Phase 2',       'Gurugram',  'Haryana',      '122002', 'Dr Sunita Rao', '9900112234', 'active',   4.6, 15, 'e7b7de81-8937-435d-8875-823b41598a46'),
  ('11111111-0000-0000-0000-000000000009', 'GreenEnergy Solutions',      'Energy & Utilities',        '29AABCG1234Y1AA', 'AABCG1234Y', 'info@greenenergy.in',         '8800990011', '3 Solar Park',         'Bangalore', 'Karnataka',    '560100', 'Asha Nair',     '8800990012', 'pending',  0.0,  0, 'b4012020-f90f-4051-8e6c-729354d32051'),
  ('11111111-0000-0000-0000-000000000010', 'FoodFirst Catering',         'Catering & Hospitality',    '27AABCF5678Z1BB', 'AABCF5678Z', 'events@foodfirst.in',         '7711223344', '67 BKC',               'Mumbai',    'Maharashtra',  '400051', 'Chef Ramesh',   '7711223345', 'active',   4.3,  9, '6d69228e-8cd2-4bff-b186-bc412ff30fa5');

-- Link the vendor auth user to Tech Supplies Pvt Ltd
-- (update vendor record's contact details to match the vendor demo account)
UPDATE vendors
SET email = 'vendor@vendorbridge.com', contact_person = 'Suresh Patel', contact_phone = '9900004444'
WHERE id = '11111111-0000-0000-0000-000000000001';


-- ============================================================
-- RFQs (5 sample RFQs — rfq_number set by trigger)
-- Created by different internal roles
-- ============================================================
INSERT INTO rfqs (id, title, description, status, priority, category, deadline, created_by) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Office Furniture Procurement Q3',  'Procure ergonomic chairs, standing desks and storage units for the new floor',  'open',   'high',   'Office Supplies',           CURRENT_DATE + 14, 'b4012020-f90f-4051-8e6c-729354d32051'),
  ('22222222-0000-0000-0000-000000000002', 'Annual IT Hardware Refresh',         'Laptops, monitors, keyboards and mice for 50 employees',                         'open',   'high',   'IT & Electronics',          CURRENT_DATE + 21, '6d69228e-8cd2-4bff-b186-bc412ff30fa5'),
  ('22222222-0000-0000-0000-000000000003', 'Canteen Catering Contract Q4',       'Daily lunch and snacks catering for 200 employees',                              'closed', 'medium', 'Catering & Hospitality',    CURRENT_DATE - 5,  'b4012020-f90f-4051-8e6c-729354d32051'),
  ('22222222-0000-0000-0000-000000000004', 'Security Guards Deployment',         'Provide 10 trained security guards for office premises',                         'draft',  'medium', 'Security Services',         CURRENT_DATE + 30, '6d69228e-8cd2-4bff-b186-bc412ff30fa5'),
  ('22222222-0000-0000-0000-000000000005', 'Cleaning & Housekeeping Services',   'Monthly contract for full office cleaning',                                      'open',   'low',    'Facilities Management',     CURRENT_DATE + 10, '6d69228e-8cd2-4bff-b186-bc412ff30fa5');


-- ============================================================
-- RFQ ITEMS
-- ============================================================
INSERT INTO rfq_items (rfq_id, product_name, description, quantity, unit, specifications, sort_order) VALUES
  -- RFQ 1: Office Furniture
  ('22222222-0000-0000-0000-000000000001', 'Ergonomic Office Chair', 'Lumbar support, adjustable armrests',      50, 'Pcs',  'ISO 9001 certified, max load 120kg',              1),
  ('22222222-0000-0000-0000-000000000001', 'Standing Desk',          'Height-adjustable electric desk',          20, 'Pcs',  'Width 140cm, electric motor, memory presets',     2),
  ('22222222-0000-0000-0000-000000000001', 'Storage Cabinet',        '3-shelf lockable metal cabinet',           15, 'Pcs',  'H 180cm x W 90cm x D 45cm',                      3),
  -- RFQ 2: IT Hardware
  ('22222222-0000-0000-0000-000000000002', 'Laptop',                 'Business class laptop',                    50, 'Pcs',  'Intel i7, 16GB RAM, 512GB SSD, 15.6" FHD',       1),
  ('22222222-0000-0000-0000-000000000002', 'Monitor',                '24 inch Full HD monitor',                  50, 'Pcs',  '24" IPS, 1920x1080, HDMI+DP',                    2),
  ('22222222-0000-0000-0000-000000000002', 'Wireless Keyboard & Mouse', 'Combo pack',                           50, 'Set',  'USB dongle, 12-month battery life',               3),
  -- RFQ 3: Catering
  ('22222222-0000-0000-0000-000000000003', 'Lunch Meals',            'Full meal with rice, dal, sabzi, roti',   200, 'Nos',  'Hygienic, ISO food safety',                       1),
  ('22222222-0000-0000-0000-000000000003', 'Evening Snacks',         'Tea/coffee + snack',                      200, 'Nos',  'Hot beverages, variety snacks',                   2),
  -- RFQ 5: Cleaning
  ('22222222-0000-0000-0000-000000000005', 'Daily Office Cleaning',  'Full sweep, mop, dustbin clearance',        1, 'Unit', 'Morning shift 6am-9am, 5000 sqft',               1),
  ('22222222-0000-0000-0000-000000000005', 'Deep Cleaning',          'Monthly intensive cleaning',                1, 'Unit', 'Carpets, windows, AC vents',                      2);


-- ============================================================
-- RFQ VENDORS (vendor invitations)
-- ============================================================
INSERT INTO rfq_vendors (rfq_id, vendor_id, responded) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', true),   -- Office World → Office Furniture RFQ
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', true),   -- PrintXpress → Office Furniture RFQ
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', true),   -- Tech Supplies → IT Hardware RFQ
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000010', true),   -- FoodFirst → Catering RFQ
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000004', false);  -- CleanPro → Cleaning RFQ (not responded)


-- ============================================================
-- QUOTATIONS (submitted by the vendor user role)
-- ============================================================
INSERT INTO quotations (id, rfq_id, vendor_id, status, delivery_days, payment_terms, validity_days, notes, subtotal, tax_percentage, tax_amount, total_amount) VALUES
  -- RFQ 1: Office Furniture — 2 quotes
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'accepted',     15, 'Net 30 days',                  30, 'Includes free delivery and installation',          425000, 18,  76500,  501500),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', 'rejected',     21, 'Net 45 days',                  30, 'Delivery in batches of 25 units',                  462000, 18,  83160,  545160),
  -- RFQ 2: IT Hardware — 1 quote (under review by procurement officer)
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'under_review', 10, 'Advance 50%, balance on delivery', 15, 'All items with 1-year warranty',               2250000, 18, 405000, 2655000),
  -- RFQ 3: Catering — 1 accepted quote
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000010', 'accepted',      3, 'Monthly invoice',              60, 'Menu rotates weekly, GST included',                180000,  5,   9000,  189000);


-- ============================================================
-- QUOTATION ITEMS
-- ============================================================
INSERT INTO quotation_items (quotation_id, product_name, quantity, unit, unit_price, notes) VALUES
  -- Quote 1 (Office World Solutions — RFQ 1)
  ('33333333-0000-0000-0000-000000000001', 'Ergonomic Office Chair',      50, 'Pcs',  5500, 'Brand: ErgoSit Pro'),
  ('33333333-0000-0000-0000-000000000001', 'Standing Desk',               20, 'Pcs', 12500, 'Electric, 3-preset memory'),
  ('33333333-0000-0000-0000-000000000001', 'Storage Cabinet',             15, 'Pcs',  4000, 'Powder-coated steel'),
  -- Quote 2 (PrintXpress India — RFQ 1)
  ('33333333-0000-0000-0000-000000000002', 'Ergonomic Office Chair',      50, 'Pcs',  6200, 'Imported brand'),
  ('33333333-0000-0000-0000-000000000002', 'Standing Desk',               20, 'Pcs', 13000, 'Premium model'),
  ('33333333-0000-0000-0000-000000000002', 'Storage Cabinet',             15, 'Pcs',  4200, 'Heavy duty'),
  -- Quote 3 (Tech Supplies — RFQ 2)
  ('33333333-0000-0000-0000-000000000003', 'Laptop',                      50, 'Pcs', 32000, 'Dell Latitude 5540'),
  ('33333333-0000-0000-0000-000000000003', 'Monitor',                     50, 'Pcs',  9500, 'LG 24MK600M'),
  ('33333333-0000-0000-0000-000000000003', 'Wireless Keyboard & Mouse',   50, 'Set',  2000, 'Logitech MK345'),
  -- Quote 4 (FoodFirst Catering — RFQ 3)
  ('33333333-0000-0000-0000-000000000004', 'Lunch Meals',                200, 'Nos',   120, '4-course meal'),
  ('33333333-0000-0000-0000-000000000004', 'Evening Snacks',             200, 'Nos',    60, 'Tea + 2 snacks');


-- ============================================================
-- APPROVALS
-- admin and manager are the approvers (per RBAC)
-- procurement_officer raises requests
-- ============================================================
INSERT INTO approvals (id, rfq_id, quotation_id, approver_id, requested_by, status, remarks, approved_at) VALUES
  -- Approved: Office Furniture — manager approves, officer requested
  ('44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'b4012020-f90f-4051-8e6c-729354d32051', '6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'approved', 'Best value for money. Office World Solutions chosen.',     NOW() - INTERVAL '3 days'),
  -- Approved: Catering — admin approves, manager requested
  ('44444444-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004', 'e7b7de81-8937-435d-8875-823b41598a46',   'b4012020-f90f-4051-8e6c-729354d32051', 'approved', 'FoodFirst meets all hygiene requirements.',                NOW() - INTERVAL '1 day'),
  -- Pending: IT Hardware — admin is approver, officer requested
  ('44444444-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'e7b7de81-8937-435d-8875-823b41598a46',   '6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'pending',  NULL,                                                      NULL);


-- ============================================================
-- PURCHASE ORDERS (auto PO number from trigger)
-- created_by = the procurement officer who issued the PO
-- ============================================================
INSERT INTO purchase_orders (id, rfq_id, quotation_id, vendor_id, approval_id, status, delivery_address, expected_delivery, terms_conditions, subtotal, tax_percentage, tax_amount, total_amount, created_by) VALUES
  ('55555555-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    '44444444-0000-0000-0000-000000000001',
    'sent',
    '5th Floor, Tower B, Corporate Park, Mumbai 400069',
    CURRENT_DATE + 15,
    'Delivery in one lot. Inspection required before acceptance.',
    425000, 18, 76500, 501500,
    '6d69228e-8cd2-4bff-b186-bc412ff30fa5'),

  ('55555555-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000003',
    '33333333-0000-0000-0000-000000000004',
    '11111111-0000-0000-0000-000000000010',
    '44444444-0000-0000-0000-000000000002',
    'acknowledged',
    'Corporate Cafeteria, Ground Floor, Tower A',
    CURRENT_DATE + 3,
    'Monthly renewal basis. Quality checks every week.',
    180000, 5, 9000, 189000,
    'b4012020-f90f-4051-8e6c-729354d32051');


-- ============================================================
-- INVOICES
-- created_by = finance/admin generating the invoice
-- ============================================================
INSERT INTO invoices (id, po_id, vendor_id, status, invoice_date, due_date, subtotal, tax_percentage, tax_amount, total_amount, created_by) VALUES
  -- Sent invoice for catering PO
  ('66666666-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000010',
    'sent',
    CURRENT_DATE - 5, CURRENT_DATE + 25,
    180000, 5, 9000, 189000,
    'e7b7de81-8937-435d-8875-823b41598a46'),

  -- Draft invoice for office furniture PO
  ('66666666-0000-0000-0000-000000000002',
    '55555555-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    'draft',
    CURRENT_DATE, CURRENT_DATE + 30,
    425000, 18, 76500, 501500,
    '6d69228e-8cd2-4bff-b186-bc412ff30fa5');


-- ============================================================
-- NOTIFICATIONS — personalized per role
-- ============================================================
INSERT INTO notifications (user_id, title, message, type, entity_type, is_read) VALUES
  -- Admin notifications
  ('e7b7de81-8937-435d-8875-823b41598a46',   'Approval Request',         'IT Hardware Refresh quotation from Tech Supplies needs your approval',         'approval', 'approval',       false),
  ('e7b7de81-8937-435d-8875-823b41598a46',   'New Vendor Registered',    'GreenEnergy Solutions has been added and is pending review',                   'rfq',      'vendor',         false),
  ('e7b7de81-8937-435d-8875-823b41598a46',   'Invoice Sent',             'Invoice INV-2026-0001 has been dispatched to FoodFirst Catering',              'invoice',  'invoice',        true),
  -- Manager notifications
  ('b4012020-f90f-4051-8e6c-729354d32051', 'New Quotation Received',   'Office World Solutions submitted a quote for Office Furniture RFQ',            'quotation','quotation',      false),
  ('b4012020-f90f-4051-8e6c-729354d32051', 'Approval Granted',         'Admin approved the Catering Contract Q4 — PO can now be raised',              'approval', 'approval',       true),
  ('b4012020-f90f-4051-8e6c-729354d32051', 'RFQ Deadline Approaching', 'Cleaning & Housekeeping Services RFQ closes in 10 days',                      'rfq',      'rfq',            false),
  -- Procurement Officer notifications
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'Quote Under Review',       'Tech Supplies quote for IT Hardware Refresh is under procurement review',      'quotation','quotation',      false),
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'PO Acknowledged',          'FoodFirst Catering has acknowledged Purchase Order PO-2026-0002',             'rfq',      'purchase_order', true),
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'RFQ Published',            'Security Guards Deployment RFQ is now in draft — add vendors to publish',     'rfq',      'rfq',            false),
  -- Vendor notifications
  ('20bff3c3-74f5-4d04-b24d-1de7387a3418',  'New RFQ Invitation',       'You have been invited to quote on: Annual IT Hardware Refresh',               'rfq',      'rfq',            false),
  ('20bff3c3-74f5-4d04-b24d-1de7387a3418',  'Quotation Accepted',       'Your quotation for Office Furniture Procurement Q3 has been accepted',        'quotation','quotation',      true),
  ('20bff3c3-74f5-4d04-b24d-1de7387a3418',  'Purchase Order Received',  'A new Purchase Order PO-2026-0001 has been issued to you',                   'rfq',      'purchase_order', false);


-- ============================================================
-- ACTIVITY LOGS — actions mapped to appropriate roles
-- ============================================================
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_label, description) VALUES
  -- Admin actions
  ('e7b7de81-8937-435d-8875-823b41598a46',   'approved',  'approval',       '44444444-0000-0000-0000-000000000002', 'Approval #2',                     'Approved catering contract quotation from FoodFirst'),
  ('e7b7de81-8937-435d-8875-823b41598a46',   'created',   'vendor',         '11111111-0000-0000-0000-000000000001', 'Tech Supplies Pvt Ltd',           'New vendor registered and linked to vendor portal account'),
  ('e7b7de81-8937-435d-8875-823b41598a46',   'sent',      'invoice',        '66666666-0000-0000-0000-000000000001', 'INV-2026-0001',                   'Invoice sent to FoodFirst Catering via email'),

  -- Manager actions
  ('b4012020-f90f-4051-8e6c-729354d32051', 'created',   'rfq',            '22222222-0000-0000-0000-000000000001', 'Office Furniture Procurement Q3', 'RFQ created and 2 vendors invited'),
  ('b4012020-f90f-4051-8e6c-729354d32051', 'created',   'rfq',            '22222222-0000-0000-0000-000000000003', 'Canteen Catering Contract Q4',    'RFQ created and FoodFirst Catering invited'),
  ('b4012020-f90f-4051-8e6c-729354d32051', 'approved',  'approval',       '44444444-0000-0000-0000-000000000001', 'Approval #1',                     'Office World Solutions quotation approved — best price'),
  ('b4012020-f90f-4051-8e6c-729354d32051', 'created',   'purchase_order', '55555555-0000-0000-0000-000000000002', 'PO for Catering Contract',        'Purchase order auto-generated after admin approval'),

  -- Procurement Officer actions
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'created',   'rfq',            '22222222-0000-0000-0000-000000000002', 'Annual IT Hardware Refresh',      'RFQ created and Tech Supplies invited'),
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'created',   'rfq',            '22222222-0000-0000-0000-000000000005', 'Cleaning & Housekeeping Services','RFQ created and CleanPro invited'),
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'created',   'purchase_order', '55555555-0000-0000-0000-000000000001', 'PO for Office Furniture',         'Purchase order issued to Office World Solutions'),
  ('6d69228e-8cd2-4bff-b186-bc412ff30fa5', 'submitted', 'approval',       '44444444-0000-0000-0000-000000000003', 'Approval #3 (IT Hardware)',       'Approval request submitted to admin for IT hardware quote'),

  -- Vendor actions
  ('20bff3c3-74f5-4d04-b24d-1de7387a3418',  'submitted', 'quotation',      '33333333-0000-0000-0000-000000000003', 'Quote for IT Hardware Refresh',   'Quotation submitted for Annual IT Hardware Refresh RFQ');
