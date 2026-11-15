import { describe, expect, it } from 'vitest';

import type { DecideFlaggedFeedImportInput, FlaggedFeedStored } from './importFlaggedFeedsLib.js';
import { decideFlaggedFeedImport } from './importFlaggedFeedsLib.js';

function stored(overrides: Partial<FlaggedFeedStored> = {}): FlaggedFeedStored {
  return {
    podcastIndexId: 15,
    lifecycleIsTakedown: false,
    spamDetectedActive: false,
    takedownActive: false,
    ...overrides,
  };
}

function input(
  overrides: Partial<DecideFlaggedFeedImportInput> = {}
): DecideFlaggedFeedImportInput {
  return {
    flag: 'spam',
    podcastIndexId: '15',
    authorityUrl: 'https://example.com/feed.xml',
    feedByPodcastIndexId: null,
    feedByAuthorityUrl: null,
    ...overrides,
  };
}

describe('decideFlaggedFeedImport', () => {
  it('skips a Podcast Index id that cannot be stored, before the URL check', () => {
    for (const podcastIndexId of [null, '', '   ', 'abc', '01', '1.2', '-3', '2147483648']) {
      expect(
        decideFlaggedFeedImport(
          input({
            podcastIndexId,
            authorityUrl: null,
          })
        )
      ).toBe('skip_no_podcast_index_id');
    }
  });

  it('skips an authority URL that cannot be stored on feed.url', () => {
    for (const authorityUrl of [null, '', '   ', 'ftp://example.com/feed.xml', 'not a url']) {
      expect(decideFlaggedFeedImport(input({ flag: 'takedown', authorityUrl }))).toBe(
        'skip_no_authority_url'
      );
    }
  });

  it('does not change a feed that already uses the authority URL with another Podcast Index id', () => {
    expect(
      decideFlaggedFeedImport(
        input({
          feedByPodcastIndexId: stored({ spamDetectedActive: true }),
          feedByAuthorityUrl: stored({ podcastIndexId: 99 }),
        })
      )
    ).toBe('skip_url_held_by_other');
  });

  it('treats a spam feed with active spam_detected and any non-takedown lifecycle as done', () => {
    expect(
      decideFlaggedFeedImport(
        input({
          feedByPodcastIndexId: stored({ spamDetectedActive: true }),
        })
      )
    ).toBe('already_blocked');
  });

  it('writes spam onto a feed that is not already in the spam end state', () => {
    expect(decideFlaggedFeedImport(input())).toBe('apply_spam');
    expect(
      decideFlaggedFeedImport(
        input({
          podcastIndexId: '2147483647',
          authorityUrl: '  https://example.com/my feed.xml  ',
        })
      )
    ).toBe('apply_spam');
    expect(
      decideFlaggedFeedImport(
        input({
          feedByPodcastIndexId: stored({
            spamDetectedActive: true,
            lifecycleIsTakedown: true,
          }),
        })
      )
    ).toBe('apply_spam');
    expect(
      decideFlaggedFeedImport(
        input({
          feedByPodcastIndexId: stored(),
        })
      )
    ).toBe('apply_spam');
  });

  it('treats takedown as done only when lifecycle is takedown and takedown_active is on', () => {
    expect(
      decideFlaggedFeedImport(
        input({
          flag: 'takedown',
          feedByPodcastIndexId: stored({
            lifecycleIsTakedown: true,
            takedownActive: true,
          }),
        })
      )
    ).toBe('already_blocked');
    expect(
      decideFlaggedFeedImport(
        input({
          flag: 'takedown',
          feedByPodcastIndexId: stored({ lifecycleIsTakedown: true }),
        })
      )
    ).toBe('apply_takedown');
    expect(
      decideFlaggedFeedImport(
        input({
          flag: 'takedown',
          feedByPodcastIndexId: stored({ takedownActive: true }),
        })
      )
    ).toBe('apply_takedown');
    expect(decideFlaggedFeedImport(input({ flag: 'takedown' }))).toBe('apply_takedown');
  });

  it('uses the authority-URL feed when it is the feed for this Podcast Index id', () => {
    expect(
      decideFlaggedFeedImport(
        input({
          feedByAuthorityUrl: stored({ spamDetectedActive: true }),
        })
      )
    ).toBe('already_blocked');
    expect(
      decideFlaggedFeedImport(
        input({
          flag: 'takedown',
          feedByAuthorityUrl: stored(),
        })
      )
    ).toBe('apply_takedown');
  });
});
