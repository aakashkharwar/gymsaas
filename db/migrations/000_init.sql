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

-- 2. Members
CREATE TABLE members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(15) NOT NULL,
    email           VARCHAR(150),
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

-- 3. Fee Payments
CREATE TABLE fee_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount          DECIMAL(10, 2) NOT NULL,
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method  VARCHAR(20) NOT NULL,
    next_due_date   DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_payments_org ON fee_payments(organization_id);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payments ON fee_payments
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
