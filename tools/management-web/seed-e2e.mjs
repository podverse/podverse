#!/usr/bin/env node
/**
 * Seed podverse_management_test with minimal deterministic E2E data for management-web tests.
 * Run via: make e2e_seed_management_web (after make test_deps)
 *
 * DB defaults: localhost:5732, user podverse_management_read_write, password test.
 *
 * Schema: admin_account (id SERIAL, id_text, admin_account_role_id FK)
 *         admin_account_credentials (id SERIAL, admin_account_id FK, email, password)
 *         admin_account_permissions (optional; role superuser bypasses CRUD checks)
 *         admin_account_role rows seeded by migration: 1=superuser, 2=admin
 *
 * Also seeds one app user in podverse_app_test (user podverse_app_read_write) whose membership
 * the billing admin E2E edits. That user is replaced on every run, so this seed can follow the
 * web seed, which truncates app accounts, or run on its own.
 */

import crypto from 'node:crypto';

import bcrypt from 'bcrypt';
import pg from 'pg';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5732');
const DB_USER = process.env.SEED_DB_USER ?? 'podverse_management_read_write';
const DB_PASSWORD = process.env.SEED_DB_PASSWORD ?? 'test';
const DB_NAME = process.env.DB_MANAGEMENT_NAME ?? 'podverse_management_test';
const APP_DB_USER = process.env.SEED_APP_DB_USER ?? 'podverse_app_read_write';
const APP_DB_PASSWORD = process.env.SEED_APP_DB_PASSWORD ?? 'test';
const APP_DB_NAME = process.env.DB_APP_NAME ?? 'podverse_app_test';

const BILLING_MEMBER_EMAIL = 'e2e-billing-member@example.com';
const BILLING_MEMBER_TRIAL_DAYS = 3;
const ACCOUNT_MEMBERSHIP_TRIAL = 1;

/**
 * A Trial member whose expiry and `trial` grant cover the same interval, so the grant ledger and
 * the cached `membership_expires_at` agree before any admin change.
 */
async function seedBillingMember(passwordHash) {
  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: APP_DB_USER,
    password: APP_DB_PASSWORD,
    database: APP_DB_NAME,
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM "account"
       WHERE id IN (SELECT account_id FROM "account_credentials" WHERE email = $1)`,
      [BILLING_MEMBER_EMAIL]
    );

    const idText = crypto.randomBytes(8).toString('hex').slice(0, 15);
    const accountResult = await client.query(
      `INSERT INTO "account" (id_text, verified, sharable_status_id)
       VALUES ($1, true, 1)
       RETURNING id`,
      [idText]
    );
    const accountId = accountResult.rows[0].id;

    await client.query(
      `INSERT INTO "account_credentials" (account_id, email, password)
       VALUES ($1, $2, $3)`,
      [accountId, BILLING_MEMBER_EMAIL, passwordHash]
    );
    await client.query(`INSERT INTO "account_settings" (account_id) VALUES ($1)`, [accountId]);

    // Date objects (not ISO strings) so the timestamp-without-time-zone cache and the timestamptz
    // grant store the same instant as the API reads them back.
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + BILLING_MEMBER_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO "account_membership_status" (account_id, account_membership_id, membership_expires_at)
       VALUES ($1, $2, $3)`,
      [accountId, ACCOUNT_MEMBERSHIP_TRIAL, endsAt]
    );
    await client.query(
      `INSERT INTO "billing_membership_grant" (account_id, source, starts_at, ends_at)
       VALUES ($1, 'trial', $2, $3)`,
      [accountId, startsAt, endsAt]
    );
    await client.query('COMMIT');
    console.log(
      `Seeded app user (Trial, ${BILLING_MEMBER_TRIAL_DAYS} days): ${BILLING_MEMBER_EMAIL}`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

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

  await client.query('TRUNCATE TABLE "admin_account" CASCADE');

  const idTextSuper = crypto.randomBytes(8).toString('hex').slice(0, 15);
  const superResult = await client.query(
    `INSERT INTO "admin_account" (id_text, admin_account_role_id)
     VALUES ($1, 1)
     RETURNING id`,
    [idTextSuper]
  );
  const superId = superResult.rows[0].id;

  await client.query(
    `INSERT INTO "admin_account_credentials" (admin_account_id, email, password)
     VALUES ($1, $2, $3)`,
    [superId, 'e2e-superadmin@example.com', passwordHash]
  );

  const idTextNoBucket = crypto.randomBytes(8).toString('hex').slice(0, 15);
  const noBucketResult = await client.query(
    `INSERT INTO "admin_account" (id_text, admin_account_role_id)
     VALUES ($1, 2)
     RETURNING id`,
    [idTextNoBucket]
  );
  const noBucketId = noBucketResult.rows[0].id;

  await client.query(
    `INSERT INTO "admin_account_credentials" (admin_account_id, email, password)
     VALUES ($1, $2, $3)`,
    [noBucketId, 'e2e-nobucket@example.com', passwordHash]
  );

  await client.query(
    `INSERT INTO "admin_account_permissions" (
       admin_account_id,
       feeds_crud,
       feed_takedown_reasons_crud,
       admins_crud,
       stats_crud,
       billing_prices_crud,
       bucket_crud,
       embed_demo_crud
     ) VALUES ($1, 2, 0, 0, 0, 0, 0, 0)`,
    [noBucketId]
  );

  console.log(`Seeded superuser: e2e-superadmin@example.com`);
  console.log(`Seeded admin (no bucket read): e2e-nobucket@example.com`);
  await client.end();

  await seedBillingMember(passwordHash);
  console.log('Management-web E2E seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
