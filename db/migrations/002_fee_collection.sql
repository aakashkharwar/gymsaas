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
CREATE POLICY tenant_isolation_fee_plans ON fee_plans
    USING (organization_id = (SELECT organization_id FROM admin_users WHERE id = auth.uid()));

-- Modify Members
ALTER TABLE members ADD COLUMN fee_plan_id UUID REFERENCES fee_plans(id) ON DELETE SET NULL;

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

-- Drop fee_payments as it's replaced
DROP TABLE IF EXISTS fee_payments CASCADE;
