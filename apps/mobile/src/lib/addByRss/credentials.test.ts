import { describe, expect, it, vi } from 'vitest';

import { ADD_BY_RSS_CREDENTIAL_MAX_LENGTH } from '@podverse/helpers-validation/client';

import type { AddByRssCredentialOwnerStore, AddByRssCredentials } from './credentials';
import {
  buildAddByRssCredentialKey,
  copySignedOutAddByRssCredentialsToAccount,
  credentialNoticeKeyForParse,
  getAddByRssCredentialsNeed,
  isAccountCredentialOwner,
  parseStoredAddByRssCredentials,
  partitionAddByRssFeedsByCredentials,
  resolveAddByRssCredentialOwner,
  resolveAddByRssCredentialStatus,
  resolveAddByRssCredentialWriteOwner,
  serializeAddByRssCredentials,
  settleSignedOutAddByRssCredentials,
  SIGNED_OUT_CREDENTIAL_OWNER,
  splitAddByRssPastedUrl,
  toAddByRssCredentialFeedUrl,
  toAddByRssCredentials,
} from './credentials';

const FEED_URL = 'https://private.example/feed.xml';
const SECURE_STORE_KEY = /^[A-Za-z0-9._-]+$/;

describe('buildAddByRssCredentialKey', () => {
  it('stays within the SecureStore key alphabet and never spells out the feed address', () => {
    const key = buildAddByRssCredentialKey('acct_1', FEED_URL);
    expect(key).toMatch(SECURE_STORE_KEY);
    expect(key).not.toContain('private.example');
    expect(key.startsWith('abrss-cred.acct_1.')).toBe(true);
  });

  it('keys a pasted userinfo URL and the stored clean URL to the same entry', () => {
    expect(buildAddByRssCredentialKey('acct_1', 'https://user:pass@private.example/feed.xml')).toBe(
      buildAddByRssCredentialKey('acct_1', FEED_URL)
    );
  });

  it('separates accounts and hashes an account id SecureStore cannot hold', () => {
    expect(buildAddByRssCredentialKey('acct_1', FEED_URL)).not.toBe(
      buildAddByRssCredentialKey('acct_2', FEED_URL)
    );
    expect(buildAddByRssCredentialKey('acct/with space', FEED_URL)).toMatch(SECURE_STORE_KEY);
  });
});

describe('stored credentials round trip', () => {
  it('reads back what it wrote and treats anything malformed as absent', () => {
    const credentials = { password: 'p@ss:word', username: 'listener' };
    expect(parseStoredAddByRssCredentials(serializeAddByRssCredentials(credentials))).toEqual(
      credentials
    );
    expect(parseStoredAddByRssCredentials(null)).toBeNull();
    expect(parseStoredAddByRssCredentials('not json')).toBeNull();
    expect(parseStoredAddByRssCredentials(JSON.stringify({ username: 'listener' }))).toBeNull();
    expect(parseStoredAddByRssCredentials(JSON.stringify(['listener', 'secret']))).toBeNull();
  });
});

describe('toAddByRssCredentials', () => {
  it('needs both fields within the API length limit', () => {
    expect(toAddByRssCredentials('  listener ', 'secret')).toEqual({
      password: 'secret',
      username: 'listener',
    });
    expect(toAddByRssCredentials('listener', '')).toBeNull();
    expect(toAddByRssCredentials('   ', 'secret')).toBeNull();
    expect(
      toAddByRssCredentials('listener', 'x'.repeat(ADD_BY_RSS_CREDENTIAL_MAX_LENGTH + 1))
    ).toBeNull();
  });
});

describe('splitAddByRssPastedUrl', () => {
  it('moves a complete user:pass@ pair out of the URL', () => {
    const split = splitAddByRssPastedUrl('https://listener:s%40cret@private.example/feed.xml');
    expect(split?.credentials).toEqual({ password: 's@cret', username: 'listener' });
    expect(split?.feedUrl).toBe(FEED_URL);
  });

  it('strips a half pair without inventing credentials, and ignores a plain URL', () => {
    const split = splitAddByRssPastedUrl('https://listener@private.example/feed.xml');
    expect(split?.credentials).toBeNull();
    expect(split?.feedUrl).toBe(FEED_URL);
    expect(splitAddByRssPastedUrl(FEED_URL)).toBeNull();
  });
});

describe('getAddByRssCredentialsNeed and partition', () => {
  const feed = (
    feedUrl: string,
    requiresCredentials: boolean,
    lastAuthFailure: 'credentials_rejected' | 'credentials_required' | null = null
  ) => ({ feedUrl, lastAuthFailure, requiresCredentials });

  it('lists a flagged feed at the end only while this device lacks its credentials', () => {
    expect(getAddByRssCredentialsNeed(feed(FEED_URL, true), false)).toBe('missing');
    expect(getAddByRssCredentialsNeed(feed(FEED_URL, true), true)).toBeNull();
    expect(getAddByRssCredentialsNeed(feed(FEED_URL, false), false)).toBeNull();
  });

  it('keeps a rejected or unanswered feed in the section even with credentials saved', () => {
    expect(getAddByRssCredentialsNeed(feed(FEED_URL, true, 'credentials_rejected'), true)).toBe(
      'rejected'
    );
    expect(getAddByRssCredentialsNeed(feed(FEED_URL, false, 'credentials_required'), true)).toBe(
      'missing'
    );
  });

  it('splits feeds against the canonical URLs that have credentials, keeping order', () => {
    const publicFeed = feed('https://public.example/feed.xml', false);
    const unlocked = feed(FEED_URL, true);
    const locked = feed('https://other-private.example/feed.xml', true);
    const split = partitionAddByRssFeedsByCredentials(
      [locked, publicFeed, unlocked],
      new Set([toAddByRssCredentialFeedUrl(FEED_URL)])
    );
    expect(split.ready).toEqual([publicFeed, unlocked]);
    expect(split.needsCredentials).toEqual([{ feed: locked, need: 'missing' }]);
  });
});

describe('resolveAddByRssCredentialStatus', () => {
  it('clears the failure after a successful parse and keeps the flag when credentials were sent', () => {
    expect(
      resolveAddByRssCredentialStatus({ credentialsState: 'sent', current: true, status: 'parsed' })
    ).toEqual({ lastAuthFailure: null, requiresCredentials: true });
  });

  it('drops the flag when the feed parsed without needing credentials', () => {
    expect(
      resolveAddByRssCredentialStatus({
        credentialsState: 'not_provided',
        current: true,
        status: 'not_modified',
      })
    ).toEqual({ lastAuthFailure: null, requiresCredentials: false });
  });

  it('records credential failures and leaves other outcomes untouched', () => {
    expect(
      resolveAddByRssCredentialStatus({
        current: false,
        failureReason: 'credentials_required',
        status: 'failed',
      })
    ).toEqual({ lastAuthFailure: 'credentials_required', requiresCredentials: true });
    expect(
      resolveAddByRssCredentialStatus({
        current: true,
        failureReason: 'credentials_rejected',
        status: 'failed',
      })
    ).toEqual({ lastAuthFailure: 'credentials_rejected', requiresCredentials: true });
    expect(resolveAddByRssCredentialStatus({ current: true, status: 'pending' })).toBeNull();
  });
});

describe('credentialNoticeKeyForParse', () => {
  it('explains credential failures and stays quiet otherwise', () => {
    expect(
      credentialNoticeKeyForParse({ failureReason: 'credentials_rejected', status: 'failed' })
    ).toBe('features.add_by_rss.credentials_rejected');
    expect(
      credentialNoticeKeyForParse({
        failureReason: 'credentials_withheld_other_domain',
        status: 'failed',
      })
    ).toBe('features.add_by_rss.credentials_withheld');
    expect(credentialNoticeKeyForParse({ status: 'parsed' })).toBeNull();
  });
});

const ACCOUNT_ID = 'abc1234';
const REMOVED_FEED_URL = 'https://removed.example/feed.xml';
const KEPT_FEED_URL = 'https://kept.example/feed.xml';
const OTHER_FEED_URL = 'https://other.example/feed.xml';

const pair = (username: string, password: string): AddByRssCredentials => ({ password, username });

const ownerStoreKey = (owner: string, feedUrl: string): string => `${owner}|${feedUrl}`;

const createOwnerStore = () => {
  const entries = new Map<string, AddByRssCredentials>();
  const read = (owner: string, feedUrl: string): AddByRssCredentials | null =>
    entries.get(ownerStoreKey(owner, feedUrl)) ?? null;
  const store: AddByRssCredentialOwnerStore = {
    delete: async (owner, feedUrl) => {
      entries.delete(ownerStoreKey(owner, feedUrl));
    },
    get: async (owner, feedUrl) => read(owner, feedUrl),
    set: async (owner, feedUrl, credentials) => {
      entries.set(ownerStoreKey(owner, feedUrl), {
        password: credentials.password,
        username: credentials.username,
      });
    },
  };
  const snapshot = () =>
    [...entries.entries()]
      .map(([key, credentials]) => ({
        key,
        password: credentials.password,
        username: credentials.username,
      }))
      .sort((left, right) => left.key.localeCompare(right.key));
  return { read, snapshot, store };
};

describe('signed-out credential owner', () => {
  it('names the signed-out user when there is no account and keeps that owner in the key', () => {
    expect(resolveAddByRssCredentialOwner(null)).toBe(SIGNED_OUT_CREDENTIAL_OWNER);
    expect(resolveAddByRssCredentialOwner(ACCOUNT_ID)).toBe(ACCOUNT_ID);
    expect(SIGNED_OUT_CREDENTIAL_OWNER.length).toBeGreaterThan(15);
    const key = buildAddByRssCredentialKey(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL);
    expect(key.startsWith('abrss-cred.signed-out-device.')).toBe(true);
  });

  it('saves a device path under the signed-out owner and a server path under the account', () => {
    expect(resolveAddByRssCredentialWriteOwner('device', null)).toBe(SIGNED_OUT_CREDENTIAL_OWNER);
    expect(resolveAddByRssCredentialWriteOwner('device', ACCOUNT_ID)).toBe(
      SIGNED_OUT_CREDENTIAL_OWNER
    );
    expect(resolveAddByRssCredentialWriteOwner('server', ACCOUNT_ID)).toBe(ACCOUNT_ID);
    expect(resolveAddByRssCredentialWriteOwner('server', null)).toBeNull();
  });

  it('treats an account id as an account owner and the signed-out owner as not one', () => {
    expect(isAccountCredentialOwner(SIGNED_OUT_CREDENTIAL_OWNER)).toBe(false);
    expect(isAccountCredentialOwner(ACCOUNT_ID)).toBe(true);
  });
});

describe('settleSignedOutAddByRssCredentials', () => {
  it('moves saved feeds, deletes removed feeds, and keeps a feed in neither list', async () => {
    const { read, store } = createOwnerStore();
    const saved = pair('saved-user', 'saved-pass');
    const removed = pair('removed-user', 'removed-pass');
    const kept = pair('kept-user', 'kept-pass');
    await store.set(ACCOUNT_ID, FEED_URL, pair('old-user', 'old-pass'));
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, saved);
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, REMOVED_FEED_URL, removed);
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, KEPT_FEED_URL, kept);

    await settleSignedOutAddByRssCredentials(store, {
      accountIdText: ACCOUNT_ID,
      removedFeedUrls: [REMOVED_FEED_URL],
      savedFeedUrls: [FEED_URL],
    });

    expect(read(ACCOUNT_ID, FEED_URL)).toEqual(saved);
    expect(read(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL)).toBeNull();
    expect(read(SIGNED_OUT_CREDENTIAL_OWNER, REMOVED_FEED_URL)).toBeNull();
    expect(read(ACCOUNT_ID, REMOVED_FEED_URL)).toBeNull();
    expect(read(SIGNED_OUT_CREDENTIAL_OWNER, KEPT_FEED_URL)).toEqual(kept);
    expect(read(ACCOUNT_ID, KEPT_FEED_URL)).toBeNull();
  });

  it('leaves the account pair alone when the signed-out owner has nothing saved', async () => {
    const { read, store } = createOwnerStore();
    const existing = pair('member', 'account-pass');
    await store.set(ACCOUNT_ID, FEED_URL, existing);

    await settleSignedOutAddByRssCredentials(store, {
      accountIdText: ACCOUNT_ID,
      removedFeedUrls: [],
      savedFeedUrls: [FEED_URL],
    });

    expect(read(ACCOUNT_ID, FEED_URL)).toEqual(existing);
    expect(read(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL)).toBeNull();
  });

  it('changes nothing when the same settle runs again', async () => {
    const { snapshot, store } = createOwnerStore();
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, pair('saved-user', 'saved-pass'));
    await store.set(
      SIGNED_OUT_CREDENTIAL_OWNER,
      REMOVED_FEED_URL,
      pair('removed-user', 'removed-pass')
    );
    const settle = {
      accountIdText: ACCOUNT_ID,
      removedFeedUrls: [REMOVED_FEED_URL],
      savedFeedUrls: [FEED_URL],
    };

    await settleSignedOutAddByRssCredentials(store, settle);
    const afterOnce = snapshot();
    await settleSignedOutAddByRssCredentials(store, settle);

    expect(snapshot()).toEqual(afterOnce);
  });

  it('changes nothing when the account id is the signed-out owner or empty', async () => {
    const { snapshot, store } = createOwnerStore();
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, pair('listener', 'secret'));
    await store.set(ACCOUNT_ID, OTHER_FEED_URL, pair('member', 'account-pass'));
    const before = snapshot();
    const lists = { removedFeedUrls: [FEED_URL], savedFeedUrls: [OTHER_FEED_URL] };

    await settleSignedOutAddByRssCredentials(store, {
      accountIdText: SIGNED_OUT_CREDENTIAL_OWNER,
      ...lists,
    });
    await settleSignedOutAddByRssCredentials(store, { accountIdText: '', ...lists });

    expect(snapshot()).toEqual(before);
  });
});

describe('copySignedOutAddByRssCredentialsToAccount', () => {
  it('copies a signed-out pair onto an empty account entry and keeps it', async () => {
    const { read, store } = createOwnerStore();
    const signedOut = pair('listener', 'signed-out-pass');
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, signedOut);

    await copySignedOutAddByRssCredentialsToAccount(store, {
      accountIdText: ACCOUNT_ID,
      feedUrls: [FEED_URL],
    });

    expect(read(ACCOUNT_ID, FEED_URL)).toEqual(signedOut);
    expect(read(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL)).toEqual(signedOut);
  });

  it('keeps a different pair the account already holds', async () => {
    const { read, store } = createOwnerStore();
    const signedOut = pair('listener', 'signed-out-pass');
    const accountPair = pair('member', 'account-pass');
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, signedOut);
    await store.set(ACCOUNT_ID, FEED_URL, accountPair);

    await copySignedOutAddByRssCredentialsToAccount(store, {
      accountIdText: ACCOUNT_ID,
      feedUrls: [FEED_URL],
    });

    expect(read(ACCOUNT_ID, FEED_URL)).toEqual(accountPair);
    expect(read(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL)).toEqual(signedOut);
  });

  it('writes nothing under the account when the signed-out owner has no pair', async () => {
    const { read, store } = createOwnerStore();

    await copySignedOutAddByRssCredentialsToAccount(store, {
      accountIdText: ACCOUNT_ID,
      feedUrls: [FEED_URL],
    });

    expect(read(ACCOUNT_ID, FEED_URL)).toBeNull();
  });

  it('does not copy a signed-out feed that is not in the list', async () => {
    const { read, store } = createOwnerStore();
    const signedOut = pair('listener', 'signed-out-pass');
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, signedOut);

    await copySignedOutAddByRssCredentialsToAccount(store, {
      accountIdText: ACCOUNT_ID,
      feedUrls: [OTHER_FEED_URL],
    });

    expect(read(ACCOUNT_ID, FEED_URL)).toBeNull();
    expect(read(ACCOUNT_ID, OTHER_FEED_URL)).toBeNull();
    expect(read(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL)).toEqual(signedOut);
  });

  it('changes nothing when the same copy runs again', async () => {
    const { snapshot, store } = createOwnerStore();
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, pair('listener', 'signed-out-pass'));
    const copy = { accountIdText: ACCOUNT_ID, feedUrls: [FEED_URL] };

    await copySignedOutAddByRssCredentialsToAccount(store, copy);
    const afterOnce = snapshot();
    await copySignedOutAddByRssCredentialsToAccount(store, copy);

    expect(snapshot()).toEqual(afterOnce);
  });

  it('changes nothing when the account id is the signed-out owner or empty', async () => {
    const { snapshot, store } = createOwnerStore();
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, pair('listener', 'secret'));
    await store.set(ACCOUNT_ID, FEED_URL, pair('member', 'account-pass'));
    const before = snapshot();

    await copySignedOutAddByRssCredentialsToAccount(store, {
      accountIdText: SIGNED_OUT_CREDENTIAL_OWNER,
      feedUrls: [FEED_URL],
    });
    await copySignedOutAddByRssCredentialsToAccount(store, {
      accountIdText: '',
      feedUrls: [FEED_URL],
    });

    expect(snapshot()).toEqual(before);
  });

  it('never calls delete', async () => {
    const entries = new Map<string, AddByRssCredentials>();
    const deleteCredentials = vi.fn(async (owner: string, feedUrl: string) => {
      entries.delete(ownerStoreKey(owner, feedUrl));
    });
    const store: AddByRssCredentialOwnerStore = {
      delete: deleteCredentials,
      get: async (owner, feedUrl) => entries.get(ownerStoreKey(owner, feedUrl)) ?? null,
      set: async (owner, feedUrl, credentials) => {
        entries.set(ownerStoreKey(owner, feedUrl), {
          password: credentials.password,
          username: credentials.username,
        });
      },
    };
    const signedOut = pair('listener', 'signed-out-pass');
    const accountPair = pair('member', 'account-pass');
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL, signedOut);
    await store.set(SIGNED_OUT_CREDENTIAL_OWNER, OTHER_FEED_URL, signedOut);
    await store.set(ACCOUNT_ID, OTHER_FEED_URL, accountPair);

    await copySignedOutAddByRssCredentialsToAccount(store, {
      accountIdText: ACCOUNT_ID,
      feedUrls: [FEED_URL, OTHER_FEED_URL, KEPT_FEED_URL],
    });

    expect(deleteCredentials).not.toHaveBeenCalled();
    expect(entries.get(ownerStoreKey(ACCOUNT_ID, FEED_URL))).toEqual(signedOut);
    expect(entries.get(ownerStoreKey(SIGNED_OUT_CREDENTIAL_OWNER, FEED_URL))).toEqual(signedOut);
    expect(entries.get(ownerStoreKey(ACCOUNT_ID, OTHER_FEED_URL))).toEqual(accountPair);
  });
});
