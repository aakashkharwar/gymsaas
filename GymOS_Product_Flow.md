# GymOS - Product Flow & Architecture

This document outlines the end-to-end flows for GymOS, the multi-tenant gym management SaaS platform.

## 1. Onboarding & Provisioning Flow (New Gym Owner)
1. **Visit Landing Page**: A prospective gym owner visits `gymos.in` (Platform Marketing Site).
2. **Sign Up**: Clicks "Start Free Trial" and submits basic details (Gym Name, Owner Name, Phone, Email, Password).
3. **Account Creation**:
   - Supabase creates a new `organizations` record (e.g., V Gym).
   - Supabase creates an `admin_users` record linked to this `organization_id`.
   - A unique subdomain slug is generated (e.g., `vgym`).
4. **Setup Wizard**:
   - Owner configures services, pricing, timings, and uploads a logo.
   - Owner adds the first members manually or via CSV import.
5. **Dashboard Access**: The owner is redirected to `gymos.in/dashboard`, seeing their isolated data.

## 2. Gym Member Flow
1. **Gym Lead**: A potential member visits the gym's specific landing page (`vgym.gymos.in`).
2. **Inquiry**: They submit an inquiry or interact with the AI Chatbot (which knows V Gym's specific pricing and timings).
3. **Notification**: The Gym Owner receives a WhatsApp/Email notification about the lead.
4. **Enrollment**: The Gym Owner adds the member via the Dashboard.
5. **Communication**: The Member receives an automated WhatsApp welcome message branded with the Gym's name.

## 3. Daily Operations Flow (Gym Owner / Staff)
1. **Login**: Owner logs into `gymos.in/dashboard`. The system issues a JWT containing their `organization_id`.
2. **Attendance**: 
   - A tablet/phone at the front desk (Offline-first PWA) is used to scan member QR codes.
   - Attendance syncs to the server, strictly scoped to the `organization_id`.
3. **Fee Collection**: Owner marks fees as paid. The system updates the next due date and logs the payment in `fee_payments`.
4. **Expense Tracking**: Owner logs daily/monthly expenses (rent, equipment, salaries) under their `organization_id`.
5. **Profitability**: The dashboard aggregates revenue (fees) minus expenses to show a real-time Monthly P&L.

## 4. Automated Reminders Flow (System Cron)
1. **Daily Execution**: A system cron job runs daily at 9:00 AM.
2. **Fetch Data**: The system iterates over all active `organizations`.
3. **Fee Alerts**: For each organization, it identifies members whose fees are due/overdue.
4. **Owner Notification**: Sends a summary WhatsApp message to the Gym Owner.
5. **Member Notification**: Sends direct WhatsApp reminders to the members, dynamically branded with their specific Gym's name.

## 5. Billing & Subscription Flow (Platform Owner -> Gym Owner)
1. **Trial Period**: Gym Owner has a 14-day free trial.
2. **Trial Expiry**: Nearing day 14, prompts urge the Owner to subscribe via Razorpay.
3. **Subscription**: Owner subscribes to Basic (₹499) or Pro (₹999) plan.
4. **Webhook**: Razorpay sends a webhook to GymOS; the system updates `organizations.subscription_status` to `active`.
5. **Default Handling**: If payment fails, the status changes to `past_due` and dashboard access is restricted to read-only until resolved.

## 6. Super Admin Flow (Platform Owner)
1. **Login**: Varun logs into `gymos.in/super-admin` using a Super Admin account (`is_super_admin = true`).
2. **Monitoring**: Views MRR (Monthly Recurring Revenue), total active gyms, and new signups.
3. **Support**: Can suspend non-paying tenants or impersonate an organization for debugging (actions are strictly audit-logged).
