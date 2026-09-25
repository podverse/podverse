import { describe, expect, it } from 'vitest';

import {
  getAddByRSSCredentialsNeed,
  nextLocalRequiresCredentials,
  partitionAddByRSSFeedsByCredentials,
} from './credentialsStatus';
import type { AddByRSSFeedRecord } from './types';

const buildFeed = (overrides: Partial<AddByRSSFeedRecord>): AddByRSSFeedRecord => ({
  id: 1,
  idText: 'feed-1',
  resourceType: 'podcasts',
  feedUrl: 'https://example.com/feed.xml',
  title: 'Feed',
  imageUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('getAddByRSSCredentialsNeed', () => {
  it('asks for credentials only when a flagged feed has none on this browser', () => {
    expect(getAddByRSSCredentialsNeed({ requiresCredentials: true }, false)).toBe('missing');
    expect(getAddByRSSCredentialsNeed({ requiresCredentials: true }, true)).toBeNull();
    expect(getAddByRSSCredentialsNeed({ requiresCredentials: false }, false)).toBeNull();
    expect(getAddByRSSCredentialsNeed({}, false)).toBeNull();
  });

  it('keeps a feed in the section after a credential failure, even with saved credentials', () => {
    expect(
      getAddByRSSCredentialsNeed(
        { requiresCredentials: true, lastFailureReason: 'credentials_rejected' },
        true
      )
    ).toBe('rejected');
    expect(getAddByRSSCredentialsNeed({ lastFailureReason: 'credentials_required' }, true)).toBe(
      'missing'
    );
  });

  it('does not treat unrelated parse failures as a credentials problem', () => {
    expect(
      getAddByRSSCredentialsNeed({ requiresCredentials: true, lastFailureReason: 'network' }, true)
    ).toBeNull();
  });
});

describe('partitionAddByRSSFeedsByCredentials', () => {
  it('matches saved credentials by canonical feed URL and preserves order', () => {
    const publicFeed = buildFeed({ idText: 'public' });
    const savedFeed = buildFeed({
      idText: 'saved',
      feedUrl: 'https://Private.Example.com/feed.xml',
      requiresCredentials: true,
    });
    const missingFeed = buildFeed({
      idText: 'missing',
      feedUrl: 'https://locked.example.com/feed.xml',
      requiresCredentials: true,
    });
    const rejectedFeed = buildFeed({
      idText: 'rejected',
      feedUrl: 'https://rejected.example.com/feed.xml',
      requiresCredentials: true,
      lastFailureReason: 'credentials_rejected',
    });

    const result = partitionAddByRSSFeedsByCredentials(
      [publicFeed, missingFeed, savedFeed, rejectedFeed],
      new Set(['https://private.example.com/feed.xml', 'https://rejected.example.com/feed.xml'])
    );

    expect(result.ready.map((feed) => feed.idText)).toEqual(['public', 'saved']);
    expect(result.needsCredentials).toEqual([
      { feed: missingFeed, need: 'missing' },
      { feed: rejectedFeed, need: 'rejected' },
    ]);
  });
});

describe('nextLocalRequiresCredentials', () => {
  it('flags the feed after a credential failure', () => {
    for (const failureReason of ['credentials_required', 'credentials_rejected'] as const) {
      expect(
        nextLocalRequiresCredentials({ current: undefined, status: 'failed', failureReason })
      ).toBe(true);
    }
  });

  it('clears the flag when the feed parsed without sending credentials', () => {
    expect(
      nextLocalRequiresCredentials({
        current: true,
        status: 'parsed',
        credentialsState: 'not_provided',
      })
    ).toBe(false);
  });

  it('keeps the current flag for successes with credentials, other failures, and progress', () => {
    expect(
      nextLocalRequiresCredentials({ current: true, status: 'parsed', credentialsState: 'sent' })
    ).toBe(true);
    expect(
      nextLocalRequiresCredentials({ current: true, status: 'failed', failureReason: 'network' })
    ).toBe(true);
    expect(nextLocalRequiresCredentials({ current: false, status: 'processing' })).toBe(false);
    expect(nextLocalRequiresCredentials({ current: true, status: 'not_modified' })).toBe(true);
  });
});
