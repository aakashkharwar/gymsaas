# GymOS — Multi-Tenant Gym Management SaaS Platform
## Product Requirements Document (PRD) — v2.0 (Multi-Client Rewrite)

> **Change note:** This PRD is a restructured version of the original "V Gym — Complete Website & Management System" PRD (v1.0). V Gym is no longer the *only* customer — it becomes the **first paying tenant / pilot client**. Every feature below is built to serve N gym owners, each with isolated data, under one shared platform.

---

| Field | Details |
|---|---|
| **Product Name** | GymOS *(placeholder — replace with your brand)* |
| **Product Type** | Multi-tenant SaaS — gym/fitness studio management |
| **Founder / Platform Owner** | Varun |
| **Pilot Client** | V Gym, Barhaj, UP (dogfooding customer) |
| **Target Market** | Small, independent gyms in Tier-2/3 India (starting: Deoria/Gorakhpur/Azamgarh region) |
| **Document Version** | 2.0 |
| **Last Updated** | August 2026 |
| **Status** | Draft — Architecture Redesign Phase |

---

## Table of Contents

1. [What Changed From v1.0](#1-what-changed-from-v10)
2. [Executive Summary](#2-executive-summary)
3. [Problem Statement](#3-problem-statement)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [User Roles & Personas](#5-user-roles--personas)
6. [Multi-Tenancy Model](#6-multi-tenancy-model)
7. [Feature Specifications](#7-feature-specifications)
8. [Subscription & Billing](#8-subscription--billing)
9. [System Architecture](#9-system-architecture)
10. [Database Schema (Multi-Tenant)](#10-database-schema-multi-tenant)
11. [API Endpoints Overview](#11-api-endpoints-overview)
12. [Security Requirements (Tenant Isolation)](#12-security-requirements-tenant-isolation)
13. [Onboarding Flow — New Gym Signup](#13-onboarding-flow--new-gym-signup)
14. [Pricing Strategy](#14-pricing-strategy)
15. [Deployment & Hosting Notes](#15-deployment--hosting-notes)
16. [Out of Scope (v1.0 Launch)](#16-out-of-scope-v10-launch)
17. [Go-to-Market Notes](#17-go-to-market-notes)
18. [Appendix](#18-appendix)

---

## 1. What Changed From v1.0

| v1.0 (Single Gym) | v2.0 (Multi-Tenant SaaS) |
|---|---|
| One gym (V Gym), one owner, one admin login | N gyms, each with its own owner/admin login |
| One `members` table, no isolation needed | Every table scoped by `organization_id` (tenant) with Row-Level Security |
| Landing page = V Gym's marketing site | Landing page = platform's marketing site; each gym gets its own mini public page (subdomain) |
| No billing — owner isn't paying anyone | Subscription billing engine — gyms pay *you* monthly/annually |
| Single hardcoded WhatsApp/email sender (Varun's number) | Shared platform sender (v1) → per-tenant sender config (v2 upgrade path) |
| Attendance, expense tracking = internal features for one gym | Same features, but must be tenant-scoped and reusable across unrelated gyms |
| Owner = the only admin, ever | Two admin layers: **Super Admin** (you, platform-wide) and **Gym Owner/Tenant Admin** (per gym, sees only their own data) |
| Chatbot knowledge base = V Gym facts hardcoded in prompt | Chatbot knowledge base = per-tenant config (each gym enters its own timings/pricing/services) |

This is the single biggest technical shift: **everything must assume "which gym is this data for?" at every step.** Get tenant isolation wrong once, and Gym A can see Gym B's members — that's a trust-ending bug for a SaaS product, not a cosmetic one.

---

## 2. Executive Summary

GymOS is a SaaS platform that lets any small, independent gym owner in India — starting with towns like Barhaj, Deoria, and Gorakhpur — sign up, set up their gym's digital presence, and run their entire operation (members, fee tracking, attendance, expenses, WhatsApp reminders) without hiring a developer or paying for an expensive enterprise platform (Mindbody, Glofox) built for metro multi-branch chains.

Each gym owner gets:
- A branded mini landing page for their gym (lead capture + info)
- A private dashboard to manage members, fees, attendance, and monthly expenses
- Automated WhatsApp/email reminders for fee due dates and membership expiry
- A simple profit tracker (revenue collected − expenses logged)

You (Varun), as the **platform owner**, get a Super Admin view across all gyms — signups, active subscriptions, revenue, support tickets — and the platform itself becomes the revenue-generating product, not just an internal tool.

V Gym remains the first live tenant, used to validate the product before onboarding external gym owners.

---

## 3. Problem Statement

Same root problems as v1.0, but now framed at market scale rather than one gym:

| Problem (across small Indian gyms) | Impact |
|---|---|
| Most small-town gyms run on paper registers or WhatsApp/memory | No visibility into active members, dues, or profitability |
| Existing SaaS options are either too expensive (USD pricing, multi-branch features they don't need) or too shallow (basic ₹500–1000/month tools with no attendance/expense depth) | Owners either overpay or under-tool themselves |
| No India-specific, Hindi-friendly, WhatsApp-first tool built for *solo owner* gyms | Adoption stays low outside metros |
| Manual fee follow-up and lead handling doesn't scale even at 2–3 gyms, let alone as a business serving many gyms | Neither gym owners nor you (as platform builder) can grow past manual effort |

The product-market fit bet: **there's a gap between "spreadsheet" and "enterprise gym CRM" for solo-owner, small-town Indian gyms — and nobody's building specifically for that segment.**

---

## 4. Goals & Success Metrics

### 4.1 Product Goals (per-tenant, same as before)
- Automate fee tracking, reminders, and attendance for each gym independently
- Give every gym owner real-time profit visibility (revenue − expenses)
- Zero data leakage between tenants — this is non-negotiable

### 4.2 Business Goals (new — platform-level)
- Onboard V Gym as tenant #1 (pilot, 60–90 days of real usage before external sales)
- Onboard 3–5 external pilot gyms (Deoria/Gorakhpur region) within first 3 months of external launch, ideally at discounted/free "founding customer" pricing
- Reach positive unit economics (revenue per tenant > infra + support cost per tenant) before scaling marketing spend

### 4.3 Success Metrics

| Metric | Target |
|---|---|
| Tenant onboarding time (signup → first member added) | < 15 minutes, self-serve |
| Cross-tenant data leakage incidents | Zero — tested explicitly before every release |
| Monthly churn (tenants cancelling) | < 10%/month in first 6 months (expect higher early churn, this is normal) |
| WhatsApp reminder delivery time | < 5 seconds (unchanged from v1.0) |
| Dashboard load time (any tenant) | < 2 seconds regardless of total platform tenant count |
| Support response time (Super Admin → gym owner) | < 24 hours in early phase |
| Free trial → paid conversion | > 20% (industry-typical for small-biz SaaS) |

---

## 5. User Roles & Personas

### Role 1 — Super Admin (Platform Owner — Varun)
- **Access:** Everything, across all tenants
- **Goals:** Monitor signups, subscription health, platform revenue, flag/support struggling tenants, manage pricing plans
- **Dashboard:** `/super-admin` — separate from any individual gym's dashboard

### Role 2 — Gym Owner / Tenant Admin (e.g., Varun-as-V-Gym-owner, or any external gym owner)
- **Access:** Only their own gym's data — members, fees, attendance, expenses, inquiries
- **Goals:** Same as v1.0 Persona 1 — track fees, get notified of leads, manage members without paper
- **Cannot:** See any other tenant's data, ever

### Role 3 — Gym Staff (optional, Phase 2)
- **Access:** Limited — e.g., can mark attendance and record payments, cannot see expenses or edit pricing
- Deferred to v2 unless an early pilot customer specifically needs it

### Role 4 — Gym Member (end user of each individual gym)
- Same as v1.0 Persona 2 — receives WhatsApp/email reminders, has no login (no self-service portal in v1)

### Role 5 — Prospective Gym Owner (Sales Prospect)
- **New persona.** Someone who lands on the *platform's* marketing site (not any individual gym's page), evaluates GymOS, and signs up for a trial. This persona didn't exist in v1.0 — the whole platform-level marketing site is new scope.

---

## 6. Multi-Tenancy Model

### 6.1 Isolation Strategy: Shared Database + Row-Level Security (RLS)

**Decision:** One Supabase/PostgreSQL database, shared across all tenants, with every tenant-owned table carrying an `organization_id` column and Postgres Row-Level Security policies enforcing that a logged-in gym owner can only ever query rows matching their own `organization_id`.

**Why not separate database per client?**
- At this scale (dozens, maybe low hundreds of small gyms), a DB-per-tenant approach massively increases hosting cost and operational complexity (migrations must run N times, backups N times)
- RLS gives strong isolation *if implemented correctly* — the risk is a missed policy on a new table, not the architecture itself
- Easier to move to isolated databases later for large/enterprise customers if that ever becomes necessary — starting simple is correct here

### 6.2 What "Tenant" Means in the Data Model

Introduce a new top-level table: `organizations` (aka "gyms" from the product's perspective). Every other business table — `members`, `fee_payments`, `attendance`, `expenses`, `inquiries` — gets a required `organization_id` foreign key.

### 6.3 Subdomain / URL Structure

- Platform marketing site: `gymos.in` (or your chosen domain)
- Each gym's public landing page: `gymos.in/g/vgym` or subdomain `vgym.gymos.in` (subdomain preferred — feels more "their own site")
- Each gym's private dashboard: `gymos.in/dashboard` (after login, scoped automatically by the logged-in owner's `organization_id` — no need for org ID in the URL)
- Super Admin: `gymos.in/super-admin`

---

## 7. Feature Specifications

> Features below are the v1.0 features **re-scoped for multi-tenancy**, plus the three additions from our earlier discussion (attendance, expiry messaging, expense tracking) — all now built tenant-aware from day one instead of retrofitted.

### 7.1 Platform Marketing Site (New)
Public site describing GymOS itself — features, pricing, "why GymOS," signup CTA. This is separate from any individual gym's landing page. Simple single page: hero, features, pricing tiers, testimonials (once you have pilot customers), signup form.

### 7.2 Per-Tenant Public Landing Page
Same structure as v1.0's V Gym landing page (hero, services, pricing, gallery, contact form, WhatsApp float button) — but now templated. Each gym owner fills in their own: gym name, services offered, pricing, photos, address, WhatsApp number, timings. Stored in a per-tenant `gym_profile` config, rendered through one shared template rather than one hardcoded page per gym.

*Acceptance criteria carry over from v1.0 Section 5.1, applied per-tenant.*

### 7.3 Contact Form → Owner Notification (per tenant)
Same flow as v1.0 Section 5.2, but the WhatsApp/email notification routes to **that specific gym's** registered owner phone/email — pulled from `organizations.owner_phone` / `owner_email`, not a hardcoded number.

### 7.4 AI Chatbot (per-tenant knowledge base)
Same as v1.0 Section 5.3, but the system prompt is now assembled dynamically per gym: `organizations.name`, `services`, `timings`, `pricing`, `address` are injected into the prompt template at request time, instead of a single hardcoded knowledge block. This is a meaningful build difference — the chatbot route needs to know *which gym's chatbot widget* is being used (passed from the frontend as an `organization_id` or subdomain-derived).

### 7.5 Member Registration & Welcome Email (per tenant)
Same as v1.0 Section 5.4. Every `members` row carries `organization_id`. Welcome email template pulls the *gym's* branding/name, not a hardcoded "V Gym" string.

### 7.6 Fee Payment & Management (per tenant) — core feature, unchanged logic
Same as v1.0 Section 5.5 (dashboard cards, Mark-as-Paid modal, export, next-due-date calculation) — every query is now automatically scoped to the logged-in owner's `organization_id` via RLS, so the dashboard code doesn't even need to manually filter — Postgres enforces it.

### 7.7 Automated Fee Reminder Cron (per tenant, batched)
This changes meaningfully from v1.0. Instead of one cron job checking one gym, the daily 9 AM job now:
1. Loops through **all active organizations**
2. For each, queries that org's due/overdue members
3. Sends a WhatsApp alert to *that org's* registered owner number (not just Varun's)
4. Logs success/failure per organization, so a failure for one gym doesn't block others

### 7.8 Membership Expiry Messaging to Members (New — from earlier discussion)
Extends 7.7: alongside notifying the owner, the cron also sends a direct WhatsApp message to the *member* whose membership is expiring, using that gym's own name/branding in the template ("Your membership at **{{gym_name}}** expires today..."). Requires:
- A generic, reusable WhatsApp template approved once with Meta (works for any gym, since gym name is a template variable)
- Per-tenant opt-in setting (some gym owners may want this off initially)

### 7.9 Attendance System (New — from earlier discussion), Offline + Online
Same design as discussed previously (QR-code based, offline-first PWA, syncs when online) — now with `organization_id` on the `attendance` table so each gym's check-in device only ever writes/reads its own gym's records. A QR code or device tied to Gym A's tablet must be provisioned specifically to Gym A's `organization_id` at setup time — this is a new onboarding step for each tenant, not a one-time config.

### 7.10 Monthly Expense & Profit Tracking (New — from earlier discussion)
Same as discussed — `expenses` table, monthly P&L view — now `organization_id`-scoped so each gym owner sees only their own profit picture, never another gym's numbers.

### 7.11 Owner Authentication (Redesigned for Multi-Tenant)
Biggest structural change from v1.0 Section 5.6:
- `admin_users` table now includes `organization_id` (nullable for Super Admin accounts, set for tenant admins)
- Login flow is otherwise the same (JWT, bcrypt, HttpOnly cookie) — but the JWT payload now includes `organization_id`, and **every API route reads that from the token, never from a request parameter**, to prevent a malicious/buggy client from requesting another org's data
- New: **Signup flow** for new gym owners (doesn't exist in v1.0 at all — v1.0 assumed one hardcoded admin). Covered in Section 13.

### 7.12 Super Admin Panel (New)
- `/super-admin` route, separate auth flag (`is_super_admin = true` on the admin user, platform-level, not tied to any one organization)
- Views: list of all organizations (signup date, plan, status, last login), platform-wide revenue (MRR), support flags
- Actions: suspend a tenant (non-payment), manually upgrade/downgrade a plan, impersonate a tenant account for support debugging (with an audit log entry every time this is used — this is a sensitive capability and must be logged)

---

## 8. Subscription & Billing

### 8.1 Plans (Draft — Adjust After Pilot Feedback)

| Plan | Price | Includes |
|---|---|---|
| **Trial** | Free, 14 days | All features, up to 30 members |
| **Basic** | ₹499/month | Up to 150 members, fee tracking, WhatsApp owner alerts, landing page |
| **Pro** | ₹999/month | Unlimited members, attendance system, member expiry WhatsApp, expense/profit tracking, AI chatbot |

### 8.2 Billing Flow
- Razorpay Subscriptions (India-native, handles UPI/card recurring — do **not** rebuild recurring billing logic yourself)
- On trial expiry without payment: dashboard access restricted to read-only, landing page stays live (so gym doesn't lose its public presence), with an in-dashboard upgrade prompt
- Webhook from Razorpay → updates `organizations.subscription_status` (`trial` / `active` / `past_due` / `cancelled`)

### 8.3 New Table: `subscriptions`
See Section 10.7.

---

## 9. System Architecture

```
╔══════════════════════════════════════════════════════════════════════╗
║                    GYMOS MULTI-TENANT ARCHITECTURE                  ║
╚══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  USER LAYER                                                         │
│  Visitor(s) of  │  Gym Members    │  Gym Owners    │  Super Admin   │
│  gym pages      │  (WhatsApp only)│  (dashboards)  │  (platform)    │
└────────┬────────┴────────┬────────┴───────┬────────┴───────┬────────┘
         ▼                 ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 14, Vercel)                                      │
│  • Platform marketing site (gymos.in)                               │
│  • Per-tenant landing page (subdomain-resolved → org config)        │
│  • Tenant dashboard (/dashboard) — org scoped via JWT                │
│  • Super Admin panel (/super-admin)                                 │
│  • Attendance PWA (offline-first, org-provisioned)                  │
└──────────────────────────────┬────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API LAYER (Next.js API Routes)                                     │
│  Every route resolves organization_id from JWT (never from client   │
│  input) before touching the database.                               │
│  POST /api/inquiries        POST /api/attendance/sync               │
│  POST /api/chat             GET  /api/admin/expenses                │
│  POST /api/members          POST /api/billing/webhook               │
│  POST /api/payments         POST /api/auth/signup  (NEW)            │
│  GET  /api/admin/dashboard  GET  /api/super-admin/orgs (NEW)        │
│  GET  /api/cron/fee-reminders  (loops all orgs)                     │
└──────┬──────────┬──────────┬──────────┬──────────┬─────────────────┘
       ▼           ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│Supabase  │ │Nodemailer│ │MSG91   │ │ OpenAI  │ │ Razorpay │
│PostgreSQL│ │(SMTP)    │ │WhatsApp│ │gpt-4o-  │ │Subscript-│
│+ RLS     │ │          │ │ /SMS   │ │mini     │ │ions      │
│(all      │ │          │ │(shared │ │(per-org │ │(billing) │
│ tenants) │ │          │ │sender  │ │ prompt) │ │          │
│          │ │          │ │ v1)    │ │         │ │          │
└──────────┘ └──────────┘ └────────┘ └─────────┘ └──────────┘
```

### Key Architecture Decisions (New/Changed vs v1.0)

| Decision | Rationale |
|---|---|
| Shared Postgres DB + RLS instead of DB-per-tenant | Cost and operational simplicity at small-gym SaaS scale |
| `organization_id` resolved server-side from JWT only | Prevents a compromised/buggy frontend from requesting another tenant's data |
| Shared MSG91 WhatsApp sender number (v1) | Getting Meta BSP approval per-tenant number is slow (24–48h+ per gym) and blocks fast onboarding; acceptable trade-off early on, revisit as a paid "your own WhatsApp number" upgrade later |
| Razorpay Subscriptions over custom billing | Recurring billing/dunning logic is genuinely hard to build correctly — don't reinvent it |
| Cron loops all orgs in one job | Simpler than N separate scheduled jobs; must be built to not let one org's failure block others (isolate try/catch per org) |

---

## 10. Database Schema (Multi-Tenant)

### 10.1 `organizations` (NEW — the tenant table)

```sql
CREATE TABLE organizations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(100) NOT NULL,           -- "V Gym"
    slug               VARCHAR(60) NOT NULL UNIQUE,      -- "vgym" -> vgym.gymos.in
    owner_name         VARCHAR(100) NOT NULL,
    owner_phone        VARCHAR(15) NOT NULL,
    owner_email        VARCHAR(150) NOT NULL,
    address            TEXT,
    services           JSONB,                            -- flexible list, per-gym
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
```

### 10.2 `members` (modified — adds `organization_id`)

```sql
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
    UNIQUE(organization_id, phone)   -- phone unique WITHIN a gym, not globally
);

CREATE INDEX idx_members_org ON members(organization_id);
CREATE INDEX idx_members_org_status ON members(organization_id, status);

-- Row-Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_members ON members
    USING (organization_id = current_setting('app.current_org_id')::UUID);
```

> **Note:** Every tenant-owned table (`fee_payments`, `attendance`, `expenses`, `inquiries`, `email_logs`) follows this exact pattern — add `organization_id`, index it, and add an equivalent RLS policy. Not repeated in full below for brevity, but this is a mandatory step for each table, not optional.

### 10.3 `fee_payments` (modified)
Adds `organization_id UUID NOT NULL REFERENCES organizations(id)` — otherwise same as v1.0 Section 8.2.

### 10.4 `attendance` (NEW, from earlier discussion — now tenant-scoped)

```sql
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    check_in_time   TIMESTAMPTZ NOT NULL,
    sync_status     VARCHAR(20) DEFAULT 'synced',
    marked_by       VARCHAR(20) DEFAULT 'qr',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_org_member_date ON attendance(organization_id, member_id, check_in_time);
```

### 10.5 `expenses` (NEW, from earlier discussion — tenant-scoped)

```sql
CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,     -- rent, electricity, equipment, salary, other
    amount          DECIMAL(10, 2) NOT NULL,
    expense_date    DATE NOT NULL,
    notes           TEXT,
    recorded_by     UUID REFERENCES admin_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_org_date ON expenses(organization_id, expense_date);

-- Simple monthly profit view, per organization
CREATE VIEW monthly_profit AS
SELECT
    organization_id,
    DATE_TRUNC('month', payment_date) AS month,
    SUM(amount) AS revenue
FROM fee_payments
GROUP BY organization_id, DATE_TRUNC('month', payment_date);
```

### 10.6 `admin_users` (modified — adds tenant link + super admin flag)

```sql
CREATE TABLE admin_users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL for super admins
    is_super_admin   BOOLEAN NOT NULL DEFAULT FALSE,
    email            VARCHAR(150) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    otp_code         VARCHAR(6),
    otp_expires_at   TIMESTAMPTZ,
    last_login       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ( (is_super_admin = TRUE AND organization_id IS NULL)
         OR (is_super_admin = FALSE AND organization_id IS NOT NULL) )
);
```

### 10.7 `subscriptions` (NEW — billing)

```sql
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
```

---

## 11. API Endpoints Overview

### 11.1 Public / Marketing
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/inquiries` | Contact form on a *specific* gym's landing page (org resolved via subdomain) |
| `POST` | `/api/chat` | Chatbot message, org resolved from subdomain/widget config |
| `POST` | `/api/auth/signup` | **NEW** — new gym owner creates account + organization |

### 11.2 Tenant Admin (JWT required, org auto-scoped)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | This org's stats only |
| `GET` / `POST` | `/api/admin/members` | This org's members |
| `POST` | `/api/admin/payments` | Record payment for this org |
| `GET` / `POST` | `/api/admin/attendance` | **NEW** — this org's attendance |
| `GET` / `POST` | `/api/admin/expenses` | **NEW** — this org's expenses + profit view |
| `POST` | `/api/billing/upgrade` | **NEW** — change plan, redirects to Razorpay checkout |

### 11.3 Super Admin (separate auth flag required)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/super-admin/organizations` | **NEW** — list all tenants, plan, status |
| `POST` | `/api/super-admin/organizations/[id]/suspend` | **NEW** — manually suspend a tenant |
| `GET` | `/api/super-admin/revenue` | **NEW** — platform-wide MRR |

### 11.4 System
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/cron/fee-reminders` | Loops all active orgs, sends owner + member alerts |
| `POST` | `/api/billing/webhook` | **NEW** — Razorpay subscription status updates |

---

## 12. Security Requirements (Tenant Isolation)

This section is the most important addition versus v1.0 — a single-tenant system doesn't need to worry about this at all; a multi-tenant SaaS lives or dies on it.

| Control | Implementation |
|---|---|
| **Row-Level Security on every tenant table** | Postgres RLS policy checking `organization_id` against a session variable set from the verified JWT — not from any client-supplied value |
| **JWT carries `organization_id` + role** | Set once at login, never trusted from request body/query params afterward |
| **No client-supplied `organization_id` anywhere** | Every API route derives org context server-side from the verified token; a request body containing `organization_id` should be ignored/rejected, never used to select data |
| **Super Admin actions are audit-logged** | Especially "impersonate tenant" — every use logged with timestamp, admin ID, target org |
| **Automated cross-tenant leakage test** | Before every deploy: create 2 dummy orgs, confirm Org A's token cannot fetch Org B's members/payments/attendance under any circumstance — this should be a real automated test, not a manual check |
| **Subdomain → org resolution validated server-side** | Never trust a client-sent org slug without confirming it against the actual organizations table |
| Password hashing, JWT expiry, rate limiting, HTTPS, cookie security | Same as v1.0 Section 5.6 — unchanged, still required |

---

## 13. Onboarding Flow — New Gym Signup

This entire flow **did not exist in v1.0** (which assumed one hardcoded admin). It's now core to the product.

```
Prospective gym owner visits gymos.in
        ↓
Clicks "Start Free Trial"
        ↓
POST /api/auth/signup
   { gym_name, owner_name, owner_phone, owner_email, password }
        ↓
Creates organizations row (slug auto-generated from gym_name, trial_ends_at = +14 days)
Creates admin_users row (organization_id = new org, is_super_admin = false)
        ↓
Redirect to onboarding wizard (guided setup):
   1. Confirm gym slug / subdomain
   2. Add services + pricing (populates landing page + chatbot)
   3. Upload logo/photos (optional, can skip)
   4. Add first few members manually OR bulk-import from Excel/CSV
        ↓
Redirect to /dashboard — trial active, full feature access for 14 days
        ↓
Day 12–14: in-app + WhatsApp reminder to upgrade before trial ends
```

---

## 14. Pricing Strategy

- **Founding customers** (first 5–10 external gyms, likely sourced through personal network in Deoria/Gorakhpur region): offer discounted lifetime or 6-month rate as thanks for early feedback — this is standard early-SaaS practice and buys you real usage data before committing to final pricing
- **List pricing** as drafted in Section 8.1 should be validated against local willingness-to-pay — ₹499–999/month is a reasonable starting anchor given existing India-focused competitors charge similar or higher, but confirm with actual pilot conversations rather than assuming
- Revisit pricing after the pilot — don't lock it in before you have real usage/retention data

---

## 15. Deployment & Hosting Notes

Mostly unchanged from v1.0 (Vercel + Supabase + MSG91 + OpenAI), with additions:

| Addition | Notes |
|---|---|
| Wildcard subdomain routing | Vercel supports wildcard domains (`*.gymos.in`) — needed for per-tenant landing pages |
| Razorpay account | New integration, requires business KYC on Razorpay's side before going live |
| Monitoring per tenant | Sentry/UptimeRobot alerts should ideally be tenant-aware so you know *which* gym is affected, not just "something broke" |

Cost estimate scales with tenant count but stays modest until you're well past pilot scale — Supabase/Vercel free tiers likely cover the first 5–10 tenants comfortably.

---

## 16. Out of Scope (v1.0 Launch)

Carried over from the original PRD, plus new multi-tenant-specific exclusions:

| Feature | Rationale |
|---|---|
| Per-tenant custom WhatsApp Business number | Meta BSP approval per gym is slow; shared sender is acceptable for launch |
| Per-tenant custom domain (gym's own `.in` domain instead of subdomain) | Nice-to-have, adds DNS/SSL complexity per tenant — v2 |
| Gym Staff role / multi-user per tenant | Single owner-admin per gym is enough for pilot |
| Member self-service login | Same as v1.0 — members remain notification-only |
| Multi-currency / non-India billing | Out of scope — this product is India-first |
| White-labeling beyond logo/name | Full custom theming per tenant is a v2+ "Enterprise tier" feature, not needed for small gyms |
| Online payment collection *from members* (Razorpay for member fees, not just your subscription billing) | Real feature gap, but adds compliance/reconciliation complexity — v1.0 already deferred this, staying deferred here too |

---

## 17. Go-to-Market Notes

*(New section — didn't exist in v1.0, since v1.0 had no "market" to go to.)*

- **Don't skip the pilot.** Run this on V Gym alone first, for at least 60–90 days, before selling to anyone else. Multi-tenant bugs (especially data isolation ones) are far cheaper to find with one real tenant than after onboarding five.
- **First external customers should come from your own network** — gym owners you or Varun personally know in nearby towns. Cold acquisition is a much harder, separate problem from product-market fit validation.
- **Be honest with early customers that this is new** — set expectations that you're actively improving it, and get direct feedback channels (a WhatsApp group with pilot gym owners works better than a formal support ticket system at this stage).
- Revisit the "is this unique" question from earlier: it isn't, competitively — the pitch to a prospective gym owner should be *cost + local relevance + directness of support*, not "nobody else does this."

---

## 18. Appendix

### A. Migration Path From v1.0 (If V Gym's System Is Already Partially Built)

If any of the original v1.0 single-tenant code/schema already exists:
1. Create `organizations` table, insert one row for V Gym
2. Add `organization_id` column to every existing table, backfill with V Gym's org ID for all existing rows
3. Add RLS policies
4. Update every existing API route to resolve `organization_id` from the JWT instead of assuming "there's only one gym"
5. Test cross-tenant isolation explicitly before adding a second real tenant

### B. Glossary (New Terms)

| Term | Definition |
|---|---|
| **Tenant** | One gym/organization using the platform, with isolated data |
| **RLS (Row-Level Security)** | PostgreSQL feature restricting which rows a query can see based on session context |
| **Multi-tenancy** | Architecture where one shared application/database serves many independent customers |
| **MRR** | Monthly Recurring Revenue — total predictable monthly subscription income across all tenants |
| **Tenant isolation** | The guarantee that no tenant can ever access another tenant's data |

*(All other glossary terms, WhatsApp/email templates, and MSG91 setup steps from v1.0 Appendix carry over unchanged — just remember every template now needs gym name as a variable, not hardcoded "V Gym.")*

---

*This PRD supersedes v1.0 as the build target. V Gym's original single-tenant PRD remains useful as the reference for feature-level detail (exact UI copy, cron pseudocode, email templates) — this document should be read alongside it for full implementation detail, with every schema/architecture decision here taking precedence.*
