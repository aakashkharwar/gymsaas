verify_with_supabase_admin.js

This script creates a temporary Supabase auth user using the Project's Service Role key, polls public.admin_users via PostgREST to confirm the DB trigger inserted the metadata row, then deletes the test user.

Environment variables required:
- SUPABASE_URL: e.g. https://xyz.supabase.co
- SUPABASE_SERVICE_ROLE_KEY: service_role key (keep secret)

Optional env vars:
- POLL_INTERVAL_MS (default 1000)
- POLL_TIMEOUT_MS (default 15000)

Usage:
1. Ensure you have npm dependencies installed (node's built-in fetch is used; if your Node version is older you may need node-fetch installed).
2. Set environment variables. On PowerShell:
   $env:SUPABASE_URL = 'https://xyz.supabase.co'
   $env:SUPABASE_SERVICE_ROLE_KEY = 'service_role_...'
3. Run:
   node scripts/verify_with_supabase_admin.js

Notes:
- This script requires the service role key. Do NOT commit or share that key.
- The script creates and then deletes a real auth user in your Supabase project; avoid running against production projects unless you know the consequences.
