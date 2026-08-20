#!/usr/bin/env node
// Run SQL migration files in db/migrations in lexicographic order against DATABASE_URL
// Usage: set DATABASE_URL and run `node scripts/run_migrations.js`

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(2);
  }

  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in', migrationsDir);
    process.exit(0);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`Applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply ${file}:`, err.message || err);
        throw err;
      }
    }

    console.log('All migrations applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration run failed:', err);
  process.exit(1);
});
