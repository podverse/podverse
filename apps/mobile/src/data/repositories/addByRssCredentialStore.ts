import { and, eq } from 'drizzle-orm';
import * as SecureStore from 'expo-secure-store';

import { isObjectLike } from '@podverse/helpers/guards';

import type { AddByRssCredentials } from '../../lib/addByRss/credentials';
import {
  buildAddByRssCredentialKey,
  parseStoredAddByRssCredentials,
  serializeAddByRssCredentials,
  toAddByRssCredentialFeedUrl,
} from '../../lib/addByRss/credentials';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';

/**
 * Readable after the first unlock since boot, so a queued protected episode can still load while
 * the phone is locked during background playback. Every call passes the same options so reads find
 * what writes stored.
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const ACCOUNT_SNAPSHOT_ID = 'current';

/**
 * Reads the signed-in account id straight from the snapshot table. Going through
 * `accountRepository` would cycle back here through `subscriptionsRepository`.
 */
const readCurrentAccountIdText = async (): Promise<string | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ payloadJson: schema.accountSnapshot.payloadJson })
    .from(schema.accountSnapshot)
    .where(eq(schema.accountSnapshot.id, ACCOUNT_SNAPSHOT_ID))
    .limit(1);
  const raw = rows[0]?.payloadJson;
  if (raw === undefined) {
    return null;
  }
  const parsed = safeJsonParse<unknown>(raw);
  if (!isObjectLike(parsed) || typeof parsed.id_text !== 'string' || parsed.id_text === '') {
    return null;
  }
  return parsed.id_text;
};

const deleteSecret = async (accountIdText: string, feedUrl: string): Promise<void> => {
  await SecureStore.deleteItemAsync(
    buildAddByRssCredentialKey(accountIdText, feedUrl),
    SECURE_STORE_OPTIONS
  );
};

const deleteIndexRows = async (rows: { accountIdText: string; feedUrl: string }[]) => {
  for (const row of rows) {
    await getDb()
      .delete(schema.addByRssCredentialIndex)
      .where(
        and(
          eq(schema.addByRssCredentialIndex.accountIdText, row.accountIdText),
          eq(schema.addByRssCredentialIndex.feedUrl, row.feedUrl)
        )
      );
  }
};

/**
 * Device-local Basic Auth credentials for add-by-RSS feeds, keyed by account and canonical feed
 * URL. The username and password live only in SecureStore; the server never stores them and
 * SQLite holds only which feeds have them. Values must never be logged or written to the error log.
 *
 * Credentials are account data: `clearSession` removes them on every sign-out, even though the
 * feed rows themselves stay on the device.
 */
export const addByRssCredentialStore = {
  currentAccountIdText: readCurrentAccountIdText,

  get: async (accountIdText: string, feedUrl: string): Promise<AddByRssCredentials | null> => {
    const raw = await SecureStore.getItemAsync(
      buildAddByRssCredentialKey(accountIdText, feedUrl),
      SECURE_STORE_OPTIONS
    );
    const credentials = parseStoredAddByRssCredentials(raw);
    if (credentials === null && raw !== null) {
      // An unreadable value is as good as none; drop it so the feed asks again.
      await addByRssCredentialStore.delete(accountIdText, feedUrl);
    }
    return credentials;
  },

  getForCurrentAccount: async (feedUrl: string): Promise<AddByRssCredentials | null> => {
    const accountIdText = await readCurrentAccountIdText();
    return accountIdText === null ? null : addByRssCredentialStore.get(accountIdText, feedUrl);
  },

  set: async (
    accountIdText: string,
    feedUrl: string,
    credentials: AddByRssCredentials
  ): Promise<void> => {
    await initializeDatabase();
    const canonicalFeedUrl = toAddByRssCredentialFeedUrl(feedUrl);
    await SecureStore.setItemAsync(
      buildAddByRssCredentialKey(accountIdText, canonicalFeedUrl),
      serializeAddByRssCredentials(credentials),
      SECURE_STORE_OPTIONS
    );
    const updatedAt = Date.now();
    await getDb()
      .insert(schema.addByRssCredentialIndex)
      .values({ accountIdText, feedUrl: canonicalFeedUrl, updatedAt })
      .onConflictDoUpdate({
        target: [
          schema.addByRssCredentialIndex.accountIdText,
          schema.addByRssCredentialIndex.feedUrl,
        ],
        set: { updatedAt },
      });
  },

  delete: async (accountIdText: string, feedUrl: string): Promise<void> => {
    await initializeDatabase();
    const canonicalFeedUrl = toAddByRssCredentialFeedUrl(feedUrl);
    await deleteSecret(accountIdText, canonicalFeedUrl);
    await deleteIndexRows([{ accountIdText, feedUrl: canonicalFeedUrl }]);
  },

  deleteForCurrentAccount: async (feedUrl: string): Promise<void> => {
    const accountIdText = await readCurrentAccountIdText();
    if (accountIdText !== null) {
      await addByRssCredentialStore.delete(accountIdText, feedUrl);
    }
  },

  /** Canonical feed URLs this account holds credentials for on this device. */
  listFeedUrls: async (accountIdText: string): Promise<Set<string>> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ feedUrl: schema.addByRssCredentialIndex.feedUrl })
      .from(schema.addByRssCredentialIndex)
      .where(eq(schema.addByRssCredentialIndex.accountIdText, accountIdText));
    return new Set(rows.map((row) => row.feedUrl));
  },

  /** Empty while signed out: credentials never outlive the session that saved them. */
  listFeedUrlsForCurrentAccount: async (): Promise<Set<string>> => {
    const accountIdText = await readCurrentAccountIdText();
    return accountIdText === null ? new Set() : addByRssCredentialStore.listFeedUrls(accountIdText);
  },

  /** Every stored credential for this account, keyed by canonical feed URL, for a refresh-all. */
  readAllForAccount: async (accountIdText: string): Promise<Map<string, AddByRssCredentials>> => {
    const feedUrls = await addByRssCredentialStore.listFeedUrls(accountIdText);
    const byFeedUrl = new Map<string, AddByRssCredentials>();
    for (const feedUrl of feedUrls) {
      const credentials = await addByRssCredentialStore.get(accountIdText, feedUrl);
      if (credentials !== null) {
        byFeedUrl.set(feedUrl, credentials);
      }
    }
    return byFeedUrl;
  },

  clearAccount: async (accountIdText: string): Promise<void> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        accountIdText: schema.addByRssCredentialIndex.accountIdText,
        feedUrl: schema.addByRssCredentialIndex.feedUrl,
      })
      .from(schema.addByRssCredentialIndex)
      .where(eq(schema.addByRssCredentialIndex.accountIdText, accountIdText));
    await Promise.allSettled(rows.map((row) => deleteSecret(row.accountIdText, row.feedUrl)));
    await deleteIndexRows(rows);
  },

  /**
   * Sign-out path. Clears every account's entries rather than only the snapshot's, because the
   * snapshot can already be gone (or never written) by the time a session ends.
   */
  clearAll: async (): Promise<void> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        accountIdText: schema.addByRssCredentialIndex.accountIdText,
        feedUrl: schema.addByRssCredentialIndex.feedUrl,
      })
      .from(schema.addByRssCredentialIndex);
    await Promise.allSettled(rows.map((row) => deleteSecret(row.accountIdText, row.feedUrl)));
    await getDb().delete(schema.addByRssCredentialIndex);
  },
};
