#!/usr/bin/env node
// Verify presence of trigger functions and triggers created by 001_auth_user_triggers.sql
// Usage: set DATABASE_URL and run `node scripts/verify_admin_users_triggers.js`

const { Client } = require('pg');

async function check(client, query, name) {
  const res = await client.query(query);
  const exists = res.rows.length > 0;
  console.log(`${name}: ${exists ? 'FOUND' : 'MISSING'}`);
  return exists;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    let ok = true;

    // Check functions in public schema
    ok = ok && await check(client,
      `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_auth_user_created'`,
      'function public.handle_auth_user_created()');

    ok = ok && await check(client,
      `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_auth_user_updated'`,
      'function public.handle_auth_user_updated()');

    ok = ok && await check(client,
      `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_auth_user_deleted'`,
      'function public.handle_auth_user_deleted()');

    // Check triggers on auth.users
    ok = ok && await check(client,
      `SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE t.tgname = 'auth_user_created_trigger' AND n.nspname = 'auth'`,
      'trigger auth.auth_user_created_trigger');

    ok = ok && await check(client,
      `SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE t.tgname = 'auth_user_updated_trigger' AND n.nspname = 'auth'`,
      'trigger auth.auth_user_updated_trigger');

    ok = ok && await check(client,
      `SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE t.tgname = 'auth_user_deleted_trigger' AND n.nspname = 'auth'`,
      'trigger auth.auth_user_deleted_trigger');

    // Check admin_users table exists
    ok = ok && await check(client,
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users'`,
      'table public.admin_users');

    if (ok) {
      console.log('\nVerification succeeded: all functions/triggers/tables present.');
      process.exit(0);
    } else {
      console.error('\nVerification failed: one or more items are missing.');
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Verification run failed:', err);
  process.exit(1);
});
