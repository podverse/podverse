import { describe, expect, it } from 'vitest';

import { countUnseenByPubDate } from '@podverse/helpers';

import type { StoredAddByRssBundle } from './channelSeenSync';
import { readAddByRssPubDatesMs, reconcileSeenState } from './channelSeenSync';

const at = (iso: string) => Date.parse(iso);

const remote = (subscriptionKey: string, remoteLastSeenAt: string | null) => ({
  remoteLastSeenAt,
  subscriptionKey,
});

const bundleOf = (pubDates: (string | null | undefined)[]): StoredAddByRssBundle => ({
  items: pubDates.map((pub_date) => ({ item: { pub_date } })),
});

describe('reconcileSeenState', () => {
  it('adopts the account timestamp when the server is ahead', () => {
    const plan = reconcileSeenState(
      [remote('show', '2026-05-01T00:00:00.000Z')],
      'channel',
      new Map([['show', at('2026-01-01T00:00:00.000Z')]])
    );

    expect(plan.adopt).toEqual([
      { kind: 'channel', lastSeenAtMs: at('2026-05-01T00:00:00.000Z'), subscriptionKey: 'show' },
    ]);
    expect(plan.push).toEqual([]);
  });

  it('pushes the device timestamp when the device is ahead', () => {
    const plan = reconcileSeenState(
      [remote('show', '2026-01-01T00:00:00.000Z')],
      'channel',
      new Map([['show', at('2026-05-01T00:00:00.000Z')]])
    );

    expect(plan.push).toEqual([
      { kind: 'channel', lastSeenAtMs: at('2026-05-01T00:00:00.000Z'), subscriptionKey: 'show' },
    ]);
    expect(plan.adopt).toEqual([]);
  });

  it('does nothing when both sides already agree', () => {
    const plan = reconcileSeenState(
      [remote('show', '2026-05-01T00:00:00.000Z')],
      'channel',
      new Map([['show', at('2026-05-01T00:00:00.000Z')]])
    );

    expect(plan).toEqual({ adopt: [], push: [] });
  });

  it('settles after one pass, so repeated syncs stop asking', () => {
    const local = new Map([['show', at('2026-01-01T00:00:00.000Z')]]);

    const first = reconcileSeenState([remote('show', '2026-05-01T00:00:00.000Z')], 'channel', local);
    for (const entry of first.adopt) {
      local.set(entry.subscriptionKey, entry.lastSeenAtMs);
    }

    const second = reconcileSeenState(
      [remote('show', '2026-05-01T00:00:00.000Z')],
      'channel',
      local
    );
    expect(second).toEqual({ adopt: [], push: [] });
  });

  it('adopts when the device has never opened the channel', () => {
    const plan = reconcileSeenState(
      [remote('show', '2026-05-01T00:00:00.000Z')],
      'channel',
      new Map()
    );

    expect(plan.adopt).toHaveLength(1);
    expect(plan.push).toEqual([]);
  });

  it('pushes when the account has never opened the channel but the device has', () => {
    const plan = reconcileSeenState(
      [remote('show', null)],
      'channel',
      new Map([['show', at('2026-05-01T00:00:00.000Z')]])
    );

    expect(plan.push).toHaveLength(1);
    expect(plan.adopt).toEqual([]);
  });

  it('leaves a channel alone when neither side has opened it', () => {
    const plan = reconcileSeenState([remote('show', null)], 'channel', new Map());

    expect(plan).toEqual({ adopt: [], push: [] });
  });

  it('ignores an unparseable server timestamp rather than adopting NaN', () => {
    const plan = reconcileSeenState(
      [remote('show', 'not-a-date')],
      'channel',
      new Map([['show', at('2026-05-01T00:00:00.000Z')]])
    );

    expect(plan.adopt).toEqual([]);
    expect(plan.push).toEqual([
      { kind: 'channel', lastSeenAtMs: at('2026-05-01T00:00:00.000Z'), subscriptionKey: 'show' },
    ]);
  });

  it('ignores local subscriptions the account does not follow', () => {
    const plan = reconcileSeenState(
      [remote('followed', '2026-01-01T00:00:00.000Z')],
      'channel',
      new Map([
        ['followed', at('2026-02-01T00:00:00.000Z')],
        ['local-only', at('2026-02-01T00:00:00.000Z')],
      ])
    );

    expect(plan.push.map((entry) => entry.subscriptionKey)).toEqual(['followed']);
    expect(plan.adopt).toEqual([]);
  });

  it('tags entries with the kind it was asked for, since the two key spaces are unrelated', () => {
    const plan = reconcileSeenState(
      [remote('https://example.com/feed.xml', '2026-05-01T00:00:00.000Z')],
      'add-by-rss',
      new Map()
    );

    expect(plan.adopt[0]?.kind).toBe('add-by-rss');
  });
});

describe('readAddByRssPubDatesMs', () => {
  it('reads publish dates in feed order', () => {
    expect(
      readAddByRssPubDatesMs(bundleOf(['2026-05-02T00:00:00.000Z', '2026-05-01T00:00:00.000Z']))
    ).toEqual([at('2026-05-02T00:00:00.000Z'), at('2026-05-01T00:00:00.000Z')]);
  });

  it('treats a missing, empty, or unparseable date as no date', () => {
    expect(readAddByRssPubDatesMs(bundleOf([undefined, null, '', 'whenever']))).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('returns nothing for a bundle that has never been parsed', () => {
    expect(readAddByRssPubDatesMs(null)).toEqual([]);
    expect(readAddByRssPubDatesMs({})).toEqual([]);
    expect(readAddByRssPubDatesMs({ items: [] })).toEqual([]);
  });

  it('does not let an item with no date count as unseen', () => {
    const pubDatesMs = readAddByRssPubDatesMs(
      bundleOf(['2026-05-02T00:00:00.000Z', undefined, 'whenever'])
    );

    expect(
      countUnseenByPubDate({ lastSeenAtMs: at('2026-05-01T00:00:00.000Z'), pubDatesMs })
    ).toEqual({ has_more_unseen: false, unseen_count: 1 });
  });
});
