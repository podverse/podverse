#!/usr/bin/env node
/**
 * Seed podverse_app_test with minimal deterministic E2E data for web tests.
 * Run via: make e2e_seed_web (after make test_deps)
 *
 * DB defaults: localhost:5732, user podverse_app_read_write, password test.
 *
 * Schema: account (id SERIAL, id_text, verified, sharable_status_id)
 *         account_credentials (id SERIAL, account_id FK, email, password)
 */

import crypto from 'node:crypto';

import bcrypt from 'bcrypt';
import pg from 'pg';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5732');
const DB_USER = process.env.SEED_DB_USER ?? 'podverse_app_read_write';
const DB_PASSWORD = process.env.SEED_DB_PASSWORD ?? 'test';
const DB_NAME = process.env.DB_APP_NAME ?? 'podverse_app_test';

const TEST_PASSWORD = 'Test!1Aa';

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await client.connect();
  console.log(`Connected to ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

  // Truncate tables used by E2E tests (order matters for FK constraints)
  // No RESTART IDENTITY — the read_write user doesn't own sequences.
  // Since test_db_init drops/recreates the DB fresh each run, sequences already start at 1.
  await client.query(`TRUNCATE TABLE "account_credentials" CASCADE`);
  await client.query(`TRUNCATE TABLE "account" CASCADE`);

  // Insert a test user: account row + account_credentials row
  const idText = crypto.randomBytes(8).toString('hex').slice(0, 15);

  const accountResult = await client.query(
    `INSERT INTO "account" (id_text, verified, sharable_status_id)
     VALUES ($1, false, 1)
     RETURNING id`,
    [idText]
  );

  const accountId = accountResult.rows[0].id;

  await client.query(
    `INSERT INTO "account_credentials" (account_id, email, password)
     VALUES ($1, $2, $3)`,
    [accountId, 'e2e-user@example.com', passwordHash]
  );

  console.log(`Seeded 1 test user: e2e-user@example.com`);
  await client.end();
  console.log('Web E2E seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
