#!/usr/bin/env node
/**
 * Seed podverse_management_test with minimal deterministic E2E data for management-web tests.
 * Run via: make e2e_seed_management_web (after make test_deps)
 *
 * DB defaults: localhost:5732, user podverse_management_read_write, password test.
 *
 * Schema: admin_account (id SERIAL, id_text, admin_account_role_id FK)
 *         admin_account_credentials (id SERIAL, admin_account_id FK, email, password)
 *         admin_account_role rows seeded by migration: 1=superuser, 2=admin
 */

import crypto from 'node:crypto';

import bcrypt from 'bcrypt';
import pg from 'pg';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5732');
const DB_USER = process.env.SEED_DB_USER ?? 'podverse_management_read_write';
const DB_PASSWORD = process.env.SEED_DB_PASSWORD ?? 'test';
const DB_NAME = process.env.DB_DATABASE ?? 'podverse_management_test';

async function main() {
  const passwordHash = await bcrypt.hash('Test!1Aa', 10);

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
  await client.query(`TRUNCATE TABLE "admin_account_credentials" CASCADE`);
  await client.query(`TRUNCATE TABLE "admin_account" CASCADE`);

  // Insert a superadmin: admin_account row + admin_account_credentials row
  const idText = crypto.randomBytes(8).toString('hex').slice(0, 15);

  const accountResult = await client.query(
    `INSERT INTO "admin_account" (id_text, admin_account_role_id)
     VALUES ($1, 1)
     RETURNING id`,
    [idText]
  );

  const accountId = accountResult.rows[0].id;

  await client.query(
    `INSERT INTO "admin_account_credentials" (admin_account_id, email, password)
     VALUES ($1, $2, $3)`,
    [accountId, 'e2e-superadmin@example.com', passwordHash]
  );

  console.log(`Seeded 1 admin user: e2e-superadmin@example.com`);
  await client.end();
  console.log('Management-web E2E seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
