import type { AddByRSSBasicAuthCredentials } from '@podverse/helpers-validation/client';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import type { SealedCredentialSecrets } from './credentialCrypto';
import {
  decryptCredentialSecrets,
  encryptCredentialSecrets,
  generateCredentialKey,
  isCredentialCryptoAvailable,
} from './credentialCrypto';

/**
 * Add-by-RSS Basic Auth credentials held on this browser only, per account and canonical feed
 * URL. Kept in its own database so the feed cache (`add-by-rss`) can be reset on upgrade without
 * touching secrets. Values are AES-GCM encrypted with a non-extractable per-account key; see
 * `generateCredentialKey` for what that does and does not protect against.
 */
const DB_NAME = 'add-by-rss-credentials';
const DB_VERSION = 1;
const KEYS_STORE = 'keys';
const CREDENTIALS_STORE = 'credentials';
const ACCOUNT_INDEX = 'accountId';

type AccountKeyRecord = {
  accountId: string;
  key: CryptoKey;
};

type CredentialRecord = SealedCredentialSecrets & {
  accountId: string;
  feedUrl: string;
  updatedAt: string;
};

const isAccountKeyRecord = (value: unknown): value is AccountKeyRecord =>
  typeof value === 'object' &&
  value !== null &&
  'accountId' in value &&
  'key' in value &&
  typeof value.accountId === 'string' &&
  value.key instanceof CryptoKey;

const isCredentialRecord = (value: unknown): value is CredentialRecord =>
  typeof value === 'object' &&
  value !== null &&
  'accountId' in value &&
  'feedUrl' in value &&
  'iv' in value &&
  'ciphertext' in value &&
  typeof value.accountId === 'string' &&
  typeof value.feedUrl === 'string' &&
  value.iv instanceof Uint8Array &&
  value.ciphertext instanceof ArrayBuffer;

export const isAddByRSSCredentialStoreAvailable = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.indexedDB !== 'undefined' &&
  isCredentialCryptoAvailable();

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEYS_STORE)) {
          db.createObjectStore(KEYS_STORE, { keyPath: 'accountId' });
        }
        if (!db.objectStoreNames.contains(CREDENTIALS_STORE)) {
          const store = db.createObjectStore(CREDENTIALS_STORE, {
            keyPath: ['accountId', 'feedUrl'],
          });
          store.createIndex(ACCOUNT_INDEX, 'accountId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
};

const toStoreFeedUrl = (feedUrl: string): string =>
  canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim();

const buildAad = (accountId: string, feedUrl: string): string => `${accountId}|${feedUrl}`;

const readAccountKey = async (accountId: string): Promise<CryptoKey | null> => {
  const db = await getDb();
  const record: unknown = await requestToPromise(
    db.transaction(KEYS_STORE, 'readonly').objectStore(KEYS_STORE).get(accountId)
  );
  return isAccountKeyRecord(record) ? record.key : null;
};

/**
 * Key generation is async WebCrypto work, which would let an open IndexedDB transaction commit
 * early, so the key is generated first and inserted with `add`. A concurrent tab that inserted
 * first wins, and this call re-reads its key.
 */
const getOrCreateAccountKey = async (accountId: string): Promise<CryptoKey> => {
  const existing = await readAccountKey(accountId);
  if (existing) {
    return existing;
  }

  const key = await generateCredentialKey();
  const db = await getDb();
  const tx = db.transaction(KEYS_STORE, 'readwrite');
  const record: AccountKeyRecord = { accountId, key };
  tx.objectStore(KEYS_STORE).add(record);
  try {
    await transactionDone(tx);
    return key;
  } catch {
    const winner = await readAccountKey(accountId);
    if (!winner) {
      throw new Error('Could not create the add-by-RSS credentials key.');
    }
    return winner;
  }
};

const readCredentialRecords = async (accountId: string): Promise<CredentialRecord[]> => {
  const db = await getDb();
  const rows: unknown[] = await requestToPromise(
    db
      .transaction(CREDENTIALS_STORE, 'readonly')
      .objectStore(CREDENTIALS_STORE)
      .index(ACCOUNT_INDEX)
      .getAll(accountId)
  );
  return rows.filter(isCredentialRecord);
};

export const getCredentials = async (
  accountId: string,
  feedUrl: string
): Promise<AddByRSSBasicAuthCredentials | null> => {
  if (!isAddByRSSCredentialStoreAvailable()) {
    return null;
  }

  const storeFeedUrl = toStoreFeedUrl(feedUrl);
  const db = await getDb();
  const record: unknown = await requestToPromise(
    db
      .transaction(CREDENTIALS_STORE, 'readonly')
      .objectStore(CREDENTIALS_STORE)
      .get([accountId, storeFeedUrl])
  );
  if (!isCredentialRecord(record)) {
    return null;
  }
  const key = await readAccountKey(accountId);
  if (!key) {
    return null;
  }
  return decryptCredentialSecrets(key, buildAad(accountId, storeFeedUrl), record);
};

/** Resolves false when this browser cannot store credentials (no IndexedDB or WebCrypto). */
export const setCredentials = async (
  accountId: string,
  feedUrl: string,
  secrets: AddByRSSBasicAuthCredentials
): Promise<boolean> => {
  if (!isAddByRSSCredentialStoreAvailable()) {
    return false;
  }

  const storeFeedUrl = toStoreFeedUrl(feedUrl);
  const key = await getOrCreateAccountKey(accountId);
  const sealed = await encryptCredentialSecrets(key, buildAad(accountId, storeFeedUrl), secrets);
  const record: CredentialRecord = {
    accountId,
    feedUrl: storeFeedUrl,
    iv: sealed.iv,
    ciphertext: sealed.ciphertext,
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  const tx = db.transaction(CREDENTIALS_STORE, 'readwrite');
  tx.objectStore(CREDENTIALS_STORE).put(record);
  await transactionDone(tx);
  return true;
};

export const deleteCredentials = async (accountId: string, feedUrl: string): Promise<void> => {
  if (!isAddByRSSCredentialStoreAvailable()) {
    return;
  }

  const db = await getDb();
  const tx = db.transaction(CREDENTIALS_STORE, 'readwrite');
  tx.objectStore(CREDENTIALS_STORE).delete([accountId, toStoreFeedUrl(feedUrl)]);
  await transactionDone(tx);
};

/** Canonical feed URLs this account has credentials for on this browser. Never the secrets. */
export const listFeedsWithCredentials = async (accountId: string): Promise<string[]> => {
  if (!isAddByRSSCredentialStoreAvailable()) {
    return [];
  }

  const records = await readCredentialRecords(accountId);
  return records.map((record) => record.feedUrl);
};

/** Decrypted credentials keyed by canonical feed URL, for a refresh-all request body. */
export const getCredentialsByFeedUrl = async (
  accountId: string
): Promise<Record<string, AddByRSSBasicAuthCredentials>> => {
  if (!isAddByRSSCredentialStoreAvailable()) {
    return {};
  }

  const [records, key] = await Promise.all([
    readCredentialRecords(accountId),
    readAccountKey(accountId),
  ]);
  if (!key) {
    return {};
  }

  const result: Record<string, AddByRSSBasicAuthCredentials> = {};
  for (const record of records) {
    const secrets = await decryptCredentialSecrets(
      key,
      buildAad(accountId, record.feedUrl),
      record
    );
    if (secrets) {
      result[record.feedUrl] = secrets;
    }
  }
  return result;
};

/**
 * Removes every credential and the key for one account. Called on logout and account deletion so
 * the next person signing in on this browser inherits nothing.
 */
export const clearAccount = async (accountId: string): Promise<void> => {
  if (!isAddByRSSCredentialStoreAvailable()) {
    return;
  }

  const db = await getDb();
  const tx = db.transaction([CREDENTIALS_STORE, KEYS_STORE], 'readwrite');
  const credentials = tx.objectStore(CREDENTIALS_STORE);
  const keys = await requestToPromise(credentials.index(ACCOUNT_INDEX).getAllKeys(accountId));
  for (const recordKey of keys) {
    credentials.delete(recordKey);
  }
  tx.objectStore(KEYS_STORE).delete(accountId);
  await transactionDone(tx);
};

/** Sign-out variant of `clearAccount`: a store failure is logged and never blocks sign-out. */
export const clearAddByRSSCredentialsForSignOut = async (
  accountId: string | null | undefined
): Promise<void> => {
  if (!accountId) {
    return;
  }
  try {
    await clearAccount(accountId);
  } catch (error) {
    console.error('Could not clear add-by-RSS credentials on this browser', error);
  }
};
