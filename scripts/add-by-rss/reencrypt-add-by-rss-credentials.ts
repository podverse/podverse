#!/usr/bin/env node
/**
 * Re-encrypt add-by-RSS Basic Auth credentials from OLD key to NEW key.
 * Run during key rotation. Requires (no defaults; validation fails fast if missing):
 *   ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY (new key, 64 hex chars)
 *   ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD (current key, 64 hex chars)
 *   DB_HOST, DB_PORT, DB_READ_USERNAME, DB_READ_PASSWORD, DB_READ_WRITE_USERNAME,
 *   DB_READ_WRITE_PASSWORD, DB_DATABASE, DEFAULT_ACCOUNT_SETTINGS_LOCALE,
 *   NODE_ENV, LOG_LEVEL
 *   Optionally: DB_SSL_CONNECTION=true
 *
 * Load env from apps/api/.env when run from repo root, e.g.:
 *   node --env-file=apps/api/.env node_modules/.bin/ts-node scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts
 * Or: cd apps/api && node --env-file=.env ../../node_modules/.bin/ts-node ../../scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts
 */
import { IsNull, Not } from 'typeorm';
import {
  createORMContext,
  getDataSourceReadWrite,
  AccountFollowingAddByRSSChannel,
  decryptWithKey,
  encryptCredentials,
} from '@podverse/orm';

const KEY_LEN = 64;

function getEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    console.error(`ERROR: ${name} is required`);
    process.exit(1);
  }
  return v;
}

function main(): void {
  const newKey = getEnv('ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY');
  const oldKey = getEnv('ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD');
  if (newKey.length !== KEY_LEN || !/^[0-9a-fA-F]+$/.test(newKey)) {
    console.error('ERROR: ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters');
    process.exit(1);
  }
  if (oldKey.length !== KEY_LEN || !/^[0-9a-fA-F]+$/.test(oldKey)) {
    console.error('ERROR: ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD must be 64 hex characters');
    process.exit(1);
  }

  const ormConfig = {
    nodeEnv: getEnv('NODE_ENV'),
    database: {
      host: getEnv('DB_HOST'),
      port: parseInt(getEnv('DB_PORT'), 10),
      read_username: getEnv('DB_READ_USERNAME'),
      read_password: getEnv('DB_READ_PASSWORD'),
      read_write_username: getEnv('DB_READ_WRITE_USERNAME'),
      read_write_password: getEnv('DB_READ_WRITE_PASSWORD'),
      database: getEnv('DB_DATABASE'),
      ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
    },
    log: { level: getEnv('LOG_LEVEL'), dir: '', timer: false },
    defaults: {
      account: {
        settings: { locale: getEnv('DEFAULT_ACCOUNT_SETTINGS_LOCALE') },
      },
    },
    addByRssCredentialsEncryptionKey: newKey,
  };

  createORMContext(ormConfig);
  const ds = getDataSourceReadWrite();

  async function run(): Promise<void> {
    await ds.initialize();
    const repo = ds.getRepository(AccountFollowingAddByRSSChannel);
    const rows = await repo.find({
      where: { basic_auth_username: Not(IsNull()) },
      select: ['account_id', 'feed_url', 'basic_auth_username', 'basic_auth_password'],
    });
    let updated = 0;
    for (const row of rows) {
      const u = row.basic_auth_username;
      const p = row.basic_auth_password;
      const needReencrypt =
        (u !== null && u !== undefined && u.startsWith('v1:')) ||
        (p !== null && p !== undefined && p.startsWith('v1:'));
      if (!needReencrypt) continue;
      const plainU =
        u !== null && u !== undefined && u.startsWith('v1:')
          ? decryptWithKey(u, oldKey)
          : (u ?? null);
      const plainP =
        p !== null && p !== undefined && p.startsWith('v1:')
          ? decryptWithKey(p, oldKey)
          : (p ?? null);
      if (
        (u !== null && u !== undefined && u.startsWith('v1:') && plainU === null) ||
        (p !== null && p !== undefined && p.startsWith('v1:') && plainP === null)
      ) {
        console.warn(
          `Skip row account_id=${row.account_id} feed_url=${row.feed_url}: decrypt failed (wrong key?)`
        );
        continue;
      }
      const newU =
        u !== null && u !== undefined && u.startsWith('v1:')
          ? encryptCredentials(plainU!)
          : (u ?? null);
      const newP =
        p !== null && p !== undefined && p.startsWith('v1:')
          ? encryptCredentials(plainP!)
          : (p ?? null);
      row.basic_auth_username = newU;
      row.basic_auth_password = newP;
      await repo.save(row);
      updated += 1;
    }
    console.log(`Re-encrypted ${updated} of ${rows.length} rows with credentials.`);
  }

  run()
    .then(() => ds.destroy())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      ds.destroy().finally(() => process.exit(1));
    });
}

main();
