import { describe, expect, it } from 'vitest';

import type { MQAddByRSSMessage, MQOpmlImportMessage } from '../types/mq.js';
import { computeMqDuplicateId, resolveMqDedupeValue } from './computeMqDuplicateId.js';

const opmlMessage = (requestId: string): MQOpmlImportMessage => ({
  accountId: 1,
  requestId,
  feeds: [{ feedUrl: 'https://example.com/a.xml' }, { feedUrl: 'https://example.com/b.xml' }],
});

const addByRssMessage = (feedUrl: string): MQAddByRSSMessage => ({
  accountId: 1,
  feedUrl,
  requestId: 'req-shared',
});

describe('resolveMqDedupeValue', () => {
  it('uses requestId for OPML import batches (never url/feedUrl)', () => {
    expect(resolveMqDedupeValue(opmlMessage('opml-req-123'))).toBe('opml-req-123');
  });

  it('uses feedUrl for add-by-rss even though requestId is present', () => {
    expect(resolveMqDedupeValue(addByRssMessage('https://example.com/only.xml'))).toBe(
      'https://example.com/only.xml'
    );
  });

  it('prefers podcast_index_id for rss parse jobs, falling back to url', () => {
    expect(resolveMqDedupeValue({ url: 'https://x/feed.xml', podcast_index_id: 42 })).toBe(42);
    expect(resolveMqDedupeValue({ url: 'https://x/feed.xml', podcast_index_id: null })).toBe(
      'https://x/feed.xml'
    );
  });
});

describe('computeMqDuplicateId', () => {
  it('returns null when dedupe window is disabled', () => {
    expect(computeMqDuplicateId('opml-import', opmlMessage('r1'), null)).toBeNull();
    expect(computeMqDuplicateId('opml-import', opmlMessage('r1'), 0)).toBeNull();
  });

  it('produces distinct ids for different OPML requestIds in the same window', () => {
    const now = 1_000_000;
    const idA = computeMqDuplicateId('opml-import', opmlMessage('req-A'), 60_000, now);
    const idB = computeMqDuplicateId('opml-import', opmlMessage('req-B'), 60_000, now);
    expect(idA).not.toBeNull();
    expect(idB).not.toBeNull();
    expect(idA).not.toBe(idB);
  });

  it('regression: two OPML batches with different requestIds are not collapsed as duplicates', () => {
    // Before the fix, OPML messages fell through to `message.url` (undefined),
    // so every batch hashed String(undefined) and collapsed to one delivery.
    const now = 1_000_000;
    const first = computeMqDuplicateId('opml-import', opmlMessage('user-1-batch'), 60_000, now);
    const second = computeMqDuplicateId('opml-import', opmlMessage('user-2-batch'), 60_000, now);
    expect(first).not.toBe(second);
  });

  it('same requestId within a window collapses to the same id', () => {
    const idEarly = computeMqDuplicateId('opml-import', opmlMessage('same'), 60_000, 1_000);
    const idLate = computeMqDuplicateId('opml-import', opmlMessage('same'), 60_000, 30_000);
    expect(idEarly).toBe(idLate);
  });
});
