import { describe, expect, it } from 'vitest';

import type {
  DTOLegacyPodcastLookupAnswer,
  DTOLegacyPodcastLookupChannel,
} from '@podverse/helpers/dto';

import type { V4StagedEntry } from './parseV4LocalState';
import { planV4Carryover } from './planV4Carryover';

const channel = (
  idText: string,
  title: string | null = 'Directory Show'
): DTOLegacyPodcastLookupChannel => ({
  id_text: idText,
  image_url: 'https://img.example/show.jpg',
  medium_id: 2,
  title,
});

const podcast = (
  legacyId: string,
  cachedFeedUrl: string | null = null,
  cachedTitle: string | null = null
): V4StagedEntry => ({
  cachedFeedUrl,
  cachedTitle,
  legacyId,
  legacyKind: 'podcast',
});

const answersFor = (
  ...answers: DTOLegacyPodcastLookupAnswer[]
): Map<string, DTOLegacyPodcastLookupAnswer> =>
  new Map(answers.map((answer) => [answer.podcast_id, answer]));

describe('planV4Carryover', () => {
  it('subscribes a podcast the lookup resolved to a directory channel', () => {
    const show = channel('chan0001');
    const plan = planV4Carryover(
      [podcast('pod-1', 'https://cached.example/feed.xml', 'Cached')],
      answersFor({ channel: show, kind: 'channel', podcast_id: 'pod-1' })
    );

    expect(plan.actions).toEqual([{ channel: show, channelIdText: 'chan0001', kind: 'subscribe' }]);
    expect(plan.rows).toEqual([
      { legacyId: 'pod-1', legacyKind: 'podcast', status: 'subscribed' },
    ]);
  });

  it('saves a feed-url answer as Add by RSS with the answer address and the cached title', () => {
    const plan = planV4Carryover(
      [podcast('pod-1', 'https://cached.example/feed.xml', 'Cached Title')],
      answersFor({
        feed_url: 'https://Answer.example/feed.xml/',
        kind: 'feed_url',
        podcast_id: 'pod-1',
      })
    );

    expect(plan.actions).toEqual([
      {
        feedUrl: 'https://answer.example/feed.xml',
        kind: 'add_by_rss',
        title: 'Cached Title',
      },
    ]);
    expect(plan.rows[0]?.status).toBe('add_by_rss');
  });

  it('counts a blocked id and does not save its cached address', () => {
    const plan = planV4Carryover(
      [podcast('pod-1', 'https://blocked.example/feed.xml', 'Blocked Show')],
      answersFor({ kind: 'blocked', podcast_id: 'pod-1' })
    );

    expect(plan.actions).toEqual([]);
    expect(plan.rows).toEqual([{ legacyId: 'pod-1', legacyKind: 'podcast', status: 'blocked' }]);
  });

  it('saves a not-here podcast from its cached address', () => {
    const plan = planV4Carryover(
      [podcast('pod-1', 'https://cached.example/feed.xml/', 'Cached Title')],
      answersFor({ kind: 'not_here', podcast_id: 'pod-1' })
    );

    expect(plan.actions).toEqual([
      {
        feedUrl: 'https://cached.example/feed.xml',
        kind: 'add_by_rss',
        title: 'Cached Title',
      },
    ]);
    expect(plan.rows[0]?.status).toBe('add_by_rss');
  });

  it('waits on a not-here podcast that has no cached address', () => {
    const plan = planV4Carryover(
      [podcast('pod-1')],
      answersFor({ kind: 'not_here', podcast_id: 'pod-1' })
    );

    expect(plan.actions).toEqual([]);
    expect(plan.rows[0]?.status).toBe('waiting');
  });

  it('leaves a podcast unchanged when the lookup did not answer', () => {
    const plan = planV4Carryover(
      [podcast('pod-1', 'https://cached.example/feed.xml', 'Cached')],
      new Map()
    );

    expect(plan.actions).toEqual([]);
    expect(plan.rows).toEqual([{ legacyId: 'pod-1', legacyKind: 'podcast', status: null }]);
  });

  it('saves an Add by RSS address with its cached title', () => {
    const plan = planV4Carryover(
      [
        {
          cachedFeedUrl: null,
          cachedTitle: 'My Feed',
          legacyId: 'https://feeds.example/show.xml',
          legacyKind: 'add_by_rss',
        },
      ],
      new Map()
    );

    expect(plan.actions).toEqual([
      {
        feedUrl: 'https://feeds.example/show.xml',
        kind: 'add_by_rss',
        title: 'My Feed',
      },
    ]);
    expect(plan.rows[0]?.status).toBe('add_by_rss');
  });

  it('follows one channel when two podcasts resolve to it', () => {
    const show = channel('chan0001', 'Shared');
    const plan = planV4Carryover(
      [podcast('pod-1'), podcast('pod-2')],
      answersFor(
        { channel: show, kind: 'channel', podcast_id: 'pod-1' },
        { channel: show, kind: 'channel', podcast_id: 'pod-2' }
      )
    );

    expect(plan.actions).toHaveLength(1);
    expect(plan.rows.map((row) => row.status)).toEqual(['subscribed', 'subscribed']);
  });

  it('saves one Add by RSS feed when two entries share an address', () => {
    const plan = planV4Carryover(
      [
        podcast('pod-1', 'https://feeds.example/show.xml/', null),
        {
          cachedFeedUrl: null,
          cachedTitle: 'From the List',
          legacyId: 'https://feeds.example/show.xml',
          legacyKind: 'add_by_rss',
        },
      ],
      answersFor({ kind: 'not_here', podcast_id: 'pod-1' })
    );

    expect(plan.actions).toEqual([
      {
        feedUrl: 'https://feeds.example/show.xml',
        kind: 'add_by_rss',
        title: 'From the List',
      },
    ]);
    expect(plan.rows.map((row) => row.status)).toEqual(['add_by_rss', 'add_by_rss']);
  });

  it('leaves a channel with no usable title unchanged', () => {
    const plan = planV4Carryover(
      [podcast('pod-1')],
      answersFor({ channel: channel('chan0001', '   '), kind: 'channel', podcast_id: 'pod-1' })
    );

    expect(plan.actions).toEqual([]);
    expect(plan.rows[0]?.status).toBeNull();
  });
});
