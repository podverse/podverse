import { describe, expect, it } from 'vitest';

import { ADD_BY_RSS_CREDENTIAL_MAX_LENGTH } from '@podverse/helpers-validation/client';

import {
  buildAddByRssCredentialKey,
  credentialNoticeKeyForParse,
  getAddByRssCredentialsNeed,
  parseStoredAddByRssCredentials,
  partitionAddByRssFeedsByCredentials,
  resolveAddByRssCredentialStatus,
  serializeAddByRssCredentials,
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
