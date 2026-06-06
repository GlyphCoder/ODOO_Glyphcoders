-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    gst_no VARCHAR(50) NOT NULL,
    contact_no VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Pending', 'Blocked')) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial vendor records
INSERT INTO public.vendors (name, category, gst_no, contact_no, status)
VALUES
('Infra Supplies Pvt Ltd', 'Constructions', '27AAICS1429B1Z0', '+91 9876543210', 'Active'),
('Tech Core LTD', 'IT', '27AAICS1429B1Z0', '+91 8765432109', 'Active'),
('FastLog Transport', 'Logistics', '27AAICS1429B1Z0', '+91 7654321098', 'Blocked'),
('Global Materials Co', 'Raw Materials', '27AAICS1429B1Z0', '+91 6543210987', 'Pending')
ON CONFLICT DO NOTHING;

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected')) DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial purchase orders
INSERT INTO public.purchase_orders (po_number, vendor_name, amount, status)
VALUES
('PO-001', 'Infra Supplies Pvt Ltd', 87000.00, 'Approved'),
('PO-002', 'Tech Core LTD', 140000.00, 'Pending'),
('PO-003', 'OfficeWood Co', 34900.00, 'Draft')
ON CONFLICT (po_number) DO NOTHING;

-- Disable RLS on the new tables for ease of testing
ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;

-- Create rfqs table
CREATE TABLE IF NOT EXISTS public.rfqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    deadline DATE NOT NULL,
    description TEXT,
    items JSONB NOT NULL,
    assigned_vendors JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'Sent', 'Closed')) DEFAULT 'Sent',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID REFERENCES public.rfqs(id) ON DELETE CASCADE,
    rfq_title VARCHAR(255) NOT NULL,
    vendor_id UUID,
    vendor_name VARCHAR(255) NOT NULL,
    items JSONB NOT NULL,
    tax_gst_percent NUMERIC(5,2) DEFAULT 18.00,
    note_terms TEXT,
    subtotal NUMERIC(15,2) NOT NULL,
    gst_amount NUMERIC(15,2) NOT NULL,
    grand_total NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'Submitted', 'Accepted', 'Rejected')) DEFAULT 'Submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable RLS on the new tables for ease of testing
ALTER TABLE public.rfqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations DISABLE ROW LEVEL SECURITY;

