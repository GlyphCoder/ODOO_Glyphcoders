-- ==========================================
-- VendorBridge Database Schema (PostgreSQL / Supabase)
-- ==========================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create user roles enum/check constraint for role-based authentication
-- Roles: 'Admin', 'Procurement Officer', 'Vendor', 'Manager / Approver'
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Procurement Officer', 'Vendor', 'Manager / Approver')),
    country VARCHAR(100),
    avatar_url TEXT, -- Store public URL or base64 encoded string of user avatar
    additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for rapid lookup during login
CREATE INDEX idx_users_email ON public.users(email);

-- Index on role for role-based queries and permissions
CREATE INDEX idx_users_role ON public.users(role);

-- Automated updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update the updated_at timestamp when a user profile is updated
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed data for testing (Optional/Pre-populated accounts)
-- Passwords are encrypted for testing. Let's provide some pre-computed bcrypt hashes
-- All accounts below have password: 'Password123'
-- Hash: '$2a$10$tQOaKswwRk2gU.8j7eR/QObe.Y6q4u8Y42H1WwV8yW.g9oW/bN0eq'

INSERT INTO public.users (first_name, last_name, email, phone, password_hash, role, country, additional_info, avatar_url)
VALUES
('Alice', 'Manager', 'admin@vendorbridge.com', '+15550100', '$2a$10$tQOaKswwRk2gU.8j7eR/QObe.Y6q4u8Y42H1WwV8yW.g9oW/bN0eq', 'Admin', 'United States', 'System administrator for VendorBridge ERP.', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice'),
('John', 'Officer', 'officer@vendorbridge.com', '+15550101', '$2a$10$tQOaKswwRk2gU.8j7eR/QObe.Y6q4u8Y42H1WwV8yW.g9oW/bN0eq', 'Procurement Officer', 'United Kingdom', 'Procurement agent specializing in global parts supply.', 'https://api.dicebear.com/7.x/adventurer/svg?seed=John'),
('Apex', 'Suppliers', 'vendor@vendorbridge.com', '+15550102', '$2a$10$tQOaKswwRk2gU.8j7eR/QObe.Y6q4u8Y42H1WwV8yW.g9oW/bN0eq', 'Vendor', 'Germany', 'Primary metal fabrication and components supplier.', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Apex'),
('Sarah', 'Approver', 'manager@vendorbridge.com', '+15550103', '$2a$10$tQOaKswwRk2gU.8j7eR/QObe.Y6q4u8Y42H1WwV8yW.g9oW/bN0eq', 'Manager / Approver', 'Canada', 'Head of financial operations & procurement approvals.', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah')
ON CONFLICT (email) DO NOTHING;
