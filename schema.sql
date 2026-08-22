-- Supabase Database Schema for GymOS (Multi-Tenant)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Tenants)
CREATE TABLE organizations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(100) NOT NULL,
    slug               VARCHAR(60) NOT NULL UNIQUE,
    owner_name         VARCHAR(100) NOT NULL,
    owner_phone        VARCHAR(15) NOT NULL,
    owner_email        VARCHAR(150) NOT NULL,
    address            TEXT,
    services           JSONB,                            
    timings            JSONB,
    plan               VARCHAR(20) NOT NULL DEFAULT 'trial'
                       CHECK (plan IN ('trial', 'basic', 'pro')),
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial'
                       CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled')),
    trial_ends_at      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);

-- 6. Admin Users (Supabase Auth Link)
-- We use auth.users under the hood, but this table stores our metadata
CREATE TABLE admin_users (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_super_admin   BOOLEAN NOT NULL DEFAULT FALSE,
    email            VARCHAR(150) NOT NULL UNIQUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: In a real system, you'd have a trigger on auth.users to create the admin_users row automatically or manage it in app code.

-- 1.5 Fee Plans
CREATE TABLE fee_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    duration_months INT NOT NULL,
    late_fee DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_plans_org ON fee_plans(organization_id);

ALTER TABLE fee_plans ENABLE ROW LEVEL SECURITY;
-- Wait, admin_users might not be defined yet. I should add policies at the end, or use auth.uid() differently if admin_users is at the end.
-- Oh wait, tenant_isolation_members uses admin_users before it's created! Let's check schema.sql. Yes, admin_users is at the bottom. PostgreSQL allows it if in separate commands but wait, we can just add the policies.

CREATE POLICY tenant_isolation_fee_plans ON fee_plans
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

-- 2. Members
CREATE TABLE members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(15) NOT NULL,
    email           VARCHAR(150),
    fee_plan_id     UUID REFERENCES fee_plans(id) ON DELETE SET NULL,
    plan_type       VARCHAR(20) NOT NULL
                    CHECK (plan_type IN ('monthly', 'quarterly', 'annual')),
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'suspended')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, phone)
);

CREATE INDEX idx_members_org ON members(organization_id);
CREATE INDEX idx_members_org_status ON members(organization_id, status);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_members ON members
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

-- 3. Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    fee_plan_id UUID REFERENCES fee_plans(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial', 'overdue')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_org_member ON invoices(organization_id, member_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_invoices ON invoices
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

-- 3.1 Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    receipt_no VARCHAR(100),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_org_member ON payments(organization_id, member_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payments ON payments
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

-- 3.2 Ledgers
CREATE TABLE ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'adjustment', 'refund')),
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledgers_org_member ON ledgers(organization_id, member_id);

ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ledgers ON ledgers
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

-- 4. Attendance
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    check_in_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_time  TIMESTAMPTZ,
    sync_status     VARCHAR(20) DEFAULT 'synced',
    marked_by       VARCHAR(20) DEFAULT 'qr',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_org_member_date ON attendance(organization_id, member_id, check_in_time);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendance ON attendance
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

-- 5. Expenses
CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,
    amount          DECIMAL(10, 2) NOT NULL,
    expense_date    DATE NOT NULL,
    notes           TEXT,
    recorded_by     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_org_date ON expenses(organization_id, expense_date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_expenses ON expenses
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));



-- 7. Subscriptions
CREATE TABLE subscriptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    razorpay_subscription_id VARCHAR(100),
    plan                  VARCHAR(20) NOT NULL CHECK (plan IN ('basic', 'pro')),
    status                VARCHAR(20) NOT NULL
                          CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
    current_period_end    TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_subscriptions ON subscriptions
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

