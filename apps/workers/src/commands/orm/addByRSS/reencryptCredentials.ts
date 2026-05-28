import { getLoggerService } from '@workers/factories/loggerService.js';
import { IsNull, Not } from 'typeorm';

import {
  AccountFollowingAddByRSSChannel,
  decryptWithKey,
  encryptCredentials,
  getDataSourceReadWrite,
  getORMConfig,
} from '@podverse/orm';

const KEY_LEN = 64;

export async function reencryptAddByRSSCredentials(): Promise<void> {
  const config = getORMConfig();
  const newKey = config.addByRssCredentialsEncryptionKey;
  const oldKey = config.addByRssCredentialsEncryptionKeyOld;

  if (!newKey || newKey.length !== KEY_LEN || !/^[0-9a-fA-F]+$/.test(newKey)) {
    console.error(
      'ERROR: ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY must be set and 64 hex characters (key rotation: this is the NEW key)'
    );
    process.exit(1);
  }
  if (!oldKey || oldKey.length !== KEY_LEN || !/^[0-9a-fA-F]+$/.test(oldKey)) {
    console.error(
      'ERROR: ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD must be set and 64 hex characters (key rotation: current key)'
    );
    process.exit(1);
  }

  const ds = getDataSourceReadWrite();
  await ds.initialize();
  const repo = ds.getRepository(AccountFollowingAddByRSSChannel);
  const rows = await repo.find({
    where: { basic_auth_username: Not(IsNull()) },
    select: {
      account_id: true,
      feed_url: true,
      basic_auth_username: true,
      basic_auth_password: true,
    },
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
      u !== null && u !== undefined && u.startsWith('v1:') && plainU !== null
        ? encryptCredentials(plainU)
        : (u ?? null);
    const newP =
      p !== null && p !== undefined && p.startsWith('v1:') && plainP !== null
        ? encryptCredentials(plainP)
        : (p ?? null);
    row.basic_auth_username = newU;
    row.basic_auth_password = newP;
    await repo.save(row);
    updated += 1;
  }
  getLoggerService().info(`Re-encrypted ${updated} of ${rows.length} rows with credentials.`);
  await ds.destroy();
}
