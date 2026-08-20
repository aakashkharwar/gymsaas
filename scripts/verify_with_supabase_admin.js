#!/usr/bin/env node
// Create a temporary Supabase auth user via the Admin API (service role key),
// verify that public.admin_users is populated by the DB trigger, then clean up.

// Environment variables required:
// SUPABASE_URL - the project URL, e.g. https://xyz.supabase.co
// SUPABASE_SERVICE_ROLE_KEY - the service_role key (kept secret)
// Optional: POLL_INTERVAL_MS (default 1000), POLL_TIMEOUT_MS (default 15000)

const fetch = globalThis.fetch || require('node-fetch');
const { randomUUID } = require('crypto');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pollInterval = Number(process.env.POLL_INTERVAL_MS || 1000);
  const pollTimeout = Number(process.env.POLL_TIMEOUT_MS || 15000);

  if (!url || !key) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(2);
  }

  // Prepare test user
  const unique = randomUUID().slice(0, 8);
  const email = `test-admin-trigger+${unique}@example.com`;
  const password = `TempPass!${Math.floor(Math.random()*9000)+1000}`;

  console.log('Creating test user:', email);

  // Create user via Admin API
  const createRes = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      email,
      password,
      // mark email_confirmed to avoid emails being sent
      email_confirm: true
    })
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error('Failed to create auth user:', createRes.status, text);
    process.exit(1);
  }

  const user = await createRes.json();
  const userId = user?.id;
  if (!userId) {
    console.error('Unexpected response from create user:', user);
    process.exit(1);
  }

  console.log('Created auth user id:', userId);

  // Poll public.admin_users via PostgREST until row appears
  const restUrl = `${url.replace(/\/$/, '')}/rest/v1/admin_users?id=eq.${userId}`;
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const deadline = Date.now() + pollTimeout;
  let found = false;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    try {
      const res = await fetch(restUrl, { headers });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          console.log('Found admin_users row for user id:', userId);
          found = true;
          break;
        }
      } else {
        const t = await res.text();
        console.warn('PostgREST query returned', res.status, t);
      }
    } catch (err) {
      console.warn('Query error:', err.message || err);
    }

    await sleep(pollInterval);
  }

  if (!found) {
    console.error('Timed out waiting for admin_users row to appear for user:', userId);
  }

  console.log('Cleaning up: deleting test user', userId);
  // Delete user via admin API
  const delRes = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });

  if (!delRes.ok) {
    const text = await delRes.text();
    console.error('Failed to delete test user:', delRes.status, text);
    // don't exit nonzero here; attempt to report found status anyway
  } else {
    console.log('Deleted test user', userId);
  }

  if (found) {
    console.log('\nSUCCESS: Trigger created admin_users row as expected.');
    process.exit(0);
  } else {
    console.error('\nFAIL: admin_users row never appeared.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
