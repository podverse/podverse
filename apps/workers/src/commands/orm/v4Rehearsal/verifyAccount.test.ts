import { describe, expect, it } from 'vitest';

import { AccountMembershipEnum } from '@podverse/helpers';

import type {
  JudgeAccountCompatibilityInput,
  VerifyGrant,
  VerifyLegacyMapRow,
} from './verifyAccount.js';
import {
  judgeAccountCompatibility,
  judgePublicPath,
  selectPublicSamplePaths,
  V4_VERIFY_SQL,
  V5_VERIFY_SQL,
} from './verifyAccount.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const HASH = 'same-hash';

function userMap(id: string): VerifyLegacyMapRow {
  return {
    legacyKind: 'user',
    legacyId: id,
    v5Kind: 'account',
    v5IdText: id,
    status: 'mapped',
  };
}

function playlistMap(id: string): VerifyLegacyMapRow {
  return {
    legacyKind: 'playlist',
    legacyId: id,
    v5Kind: 'playlist',
    v5IdText: id,
    status: 'mapped',
  };
}

function numbered(prefix: string, count: number): string[] {
  const width = Math.max(6, String(Math.max(count - 1, 0)).length);
  return Array.from(
    { length: count },
    (_, index) => `${prefix}${index.toString().padStart(width, '0')}`
  );
}

function feedUrls(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `https://feeds.example/${index}`);
}

function passingInput(
  overrides: Partial<JudgeAccountCompatibilityInput> = {}
): JudgeAccountCompatibilityInput {
  const v4Id = overrides.v4Id ?? 'account1';
  return {
    v4Id,
    accountIdText: v4Id,
    now: NOW,
    subscribedPodcastIds: [],
    subscribedPlaylistIds: [],
    subscribedUserIds: [],
    addByRssUrls: [],
    playlists: [],
    mediaRefs: [],
    playback: [],
    v4PasswordHash: HASH,
    v5PasswordHash: HASH,
    v4EmailVerified: true,
    v5Verified: true,
    membershipExpiration: null,
    freeTrialExpiration: null,
    accountMembershipId: AccountMembershipEnum.Trial,
    membershipExpiresAt: null,
    maxAddByRssFeeds: null,
    appStoreWindow: false,
    grants: [],
    followedChannelIdTexts: [],
    followedPlaylistIdTexts: [],
    followedAccountIdTexts: [],
    addByRssFeedUrls: [],
    playlistIdTexts: [],
    clipIdTexts: [],
    playlistResources: [],
    queueResourceIdTexts: [],
    pendingRows: [],
    legacyMap: [userMap(v4Id)],
    ...overrides,
  };
}

function withFeeds(
  count: number,
  stored: number | null,
  written: boolean
): JudgeAccountCompatibilityInput {
  const urls = feedUrls(count);
  return passingInput({
    addByRssUrls: urls,
    addByRssFeedUrls: written ? urls : [],
    maxAddByRssFeeds: stored,
  });
}

function legacyGrant(startsAt: Date, endsAt: Date, source = 'legacy_import'): VerifyGrant {
  return { source, startsAt, endsAt, revokedAt: null };
}

function premiumInput(
  expiry: Date,
  grantEnd: Date,
  extras: Partial<JudgeAccountCompatibilityInput> = {}
): JudgeAccountCompatibilityInput {
  const startsAt = extras.now ?? NOW;
  return passingInput({
    membershipExpiration: expiry,
    accountMembershipId: AccountMembershipEnum.Premium,
    membershipExpiresAt: grantEnd,
    grants: [legacyGrant(startsAt, grantEnd)],
    ...extras,
  });
}

describe('judgeAccountCompatibility library accounting', () => {
  it('A subscription id with a followed channel passes, and the same id with neither a follow nor a pending row is unaccounted / subscriptions.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          subscribedPodcastIds: ['podcast1'],
          followedChannelIdTexts: ['podcast1'],
        })
      )
    ).toEqual({ ok: true });
    expect(
      judgeAccountCompatibility(
        passingInput({
          subscribedPodcastIds: ['podcast1'],
          followedChannelIdTexts: ['channel1'],
          legacyMap: [
            userMap('account1'),
            {
              legacyKind: 'podcast',
              legacyId: 'podcast1',
              v5Kind: 'channel',
              v5IdText: 'channel1',
              status: 'mapped',
            },
          ],
        })
      )
    ).toEqual({ ok: true });
    expect(judgeAccountCompatibility(passingInput({ subscribedPodcastIds: ['podcast1'] }))).toEqual(
      {
        ok: false,
        class: 'unaccounted',
        group: 'subscriptions',
        exampleId: 'podcast1',
        message: 'subscriptions 1 v4, 0 covered',
      }
    );
  });

  it('A subscription pending row of status dropped passes.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          subscribedPodcastIds: ['podcast1'],
          pendingRows: [{ rowKind: 'subscription', legacyId: 'podcast1', status: 'dropped' }],
        })
      )
    ).toEqual({ ok: true });
  });

  it('A user clip pending row of status dropped is clip_dropped. An official clip is not required.', () => {
    const dropped = judgeAccountCompatibility(
      passingInput({
        mediaRefs: [{ id: 'clipusr', official: false, owned: true, isPublic: false }],
        pendingRows: [{ rowKind: 'snapshot_clip', legacyId: 'clipusr', status: 'dropped' }],
        playlists: [
          {
            id: 'biglist',
            isPublic: false,
            episodeIds: numbered('e', 10001),
            mediaRefIds: [],
          },
        ],
      })
    );
    expect(dropped).toMatchObject({
      ok: false,
      class: 'clip_dropped',
      group: 'clips',
      exampleId: 'clipusr',
    });
    expect(
      judgeAccountCompatibility(
        passingInput({
          mediaRefs: [{ id: 'officia', official: true, owned: true, isPublic: true }],
        })
      )
    ).toEqual({ ok: true });
  });

  it('A playlist-member pending row of status dropped is playlist_member_dropped. A missing mediaRef and an official mediaRef are not members.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [
            {
              id: 'playlis',
              isPublic: false,
              episodeIds: ['ep00001'],
              mediaRefIds: ['missing', 'officia'],
            },
          ],
          mediaRefs: [{ id: 'officia', official: true, owned: false, isPublic: false }],
          playlistIdTexts: ['playlis'],
          legacyMap: [userMap('account1'), playlistMap('playlis')],
          pendingRows: [
            {
              rowKind: 'snapshot_playlist_member',
              legacyId: 'playlis:ep00001',
              status: 'dropped',
            },
          ],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'playlist_member_dropped',
      group: 'playlistMembers',
      exampleId: 'ep00001',
    });
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [
            {
              id: 'playlis',
              isPublic: false,
              episodeIds: [],
              mediaRefIds: ['missing', 'officia'],
            },
          ],
          mediaRefs: [{ id: 'officia', official: true, owned: true, isPublic: false }],
          playlistIdTexts: ['playlis'],
          legacyMap: [userMap('account1'), playlistMap('playlis')],
        })
      )
    ).toEqual({ ok: true });
  });

  it('A playlist member covered by the mapped item id passes, and the same member with no resource and no pending row is unaccounted.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [{ id: 'playlis', isPublic: false, episodeIds: ['ep00001'], mediaRefIds: [] }],
          playlistIdTexts: ['playlis'],
          playlistResources: [{ playlistIdText: 'playlis', memberIdTexts: ['item0001'] }],
          legacyMap: [
            userMap('account1'),
            playlistMap('playlis'),
            {
              legacyKind: 'episode',
              legacyId: 'ep00001',
              v5Kind: 'item',
              v5IdText: 'item0001',
              status: 'mapped',
            },
          ],
        })
      )
    ).toEqual({ ok: true });
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [{ id: 'playlis', isPublic: false, episodeIds: ['ep00001'], mediaRefIds: [] }],
          playlistIdTexts: ['playlis'],
          legacyMap: [userMap('account1'), playlistMap('playlis')],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'unaccounted',
      group: 'playlistMembers',
      exampleId: 'ep00001',
    });
  });

  it("A follow of the account's own id with no follow row passes. Any other missing user follow is unaccounted / followsUser.", () => {
    expect(judgeAccountCompatibility(passingInput({ subscribedUserIds: ['account1'] }))).toEqual({
      ok: true,
    });
    expect(
      judgeAccountCompatibility(passingInput({ subscribedUserIds: ['account1', 'other11'] }))
    ).toEqual({
      ok: false,
      class: 'unaccounted',
      group: 'followsUser',
      exampleId: 'other11',
      message: 'followsUser 1 v4, 0 covered',
    });
  });

  it('Two playback rows that share one legacy id pass when that id is written once. A distinct legacy id with no resource and no pending row is unaccounted.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          playback: [
            { episodeId: null, mediaRefId: 'media111' },
            { episodeId: 'ep11111', mediaRefId: 'media111' },
          ],
          queueResourceIdTexts: ['media111'],
        })
      )
    ).toEqual({ ok: true });
    expect(
      judgeAccountCompatibility(
        passingInput({
          playback: [{ episodeId: 'ep22222', mediaRefId: null }],
          pendingRows: [{ rowKind: 'history', legacyId: 'ep22222', status: 'dropped' }],
        })
      )
    ).toEqual({ ok: true });
    expect(
      judgeAccountCompatibility(
        passingInput({
          playback: [{ episodeId: 'ep33333', mediaRefId: null }],
          queueResourceIdTexts: ['item3333'],
          legacyMap: [
            userMap('account1'),
            {
              legacyKind: 'episode',
              legacyId: 'ep33333',
              v5Kind: 'item',
              v5IdText: 'item3333',
              status: 'mapped',
            },
          ],
        })
      )
    ).toEqual({ ok: true });
    expect(
      judgeAccountCompatibility(
        passingInput({
          playback: [
            { episodeId: null, mediaRefId: 'media111' },
            { episodeId: 'ep22222', mediaRefId: null },
          ],
          queueResourceIdTexts: ['media111'],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'unaccounted',
      group: 'playback',
      exampleId: 'ep22222',
    });
  });
});

describe('judgeAccountCompatibility sign-in and public ids', () => {
  it('Equal hashes pass. A one-character hash difference is hash_mismatch. A different verified flag is verified_mismatch.', () => {
    expect(judgeAccountCompatibility(passingInput())).toEqual({ ok: true });
    const changed = 'same-hasX';
    const mismatched = judgeAccountCompatibility(passingInput({ v5PasswordHash: changed }));
    expect(mismatched).toEqual({
      ok: false,
      class: 'hash_mismatch',
      group: 'signIn',
      exampleId: 'account1',
      message: 'hash',
    });
    const serialized = JSON.stringify(mismatched);
    expect(serialized).not.toContain(HASH);
    expect(serialized).not.toContain(changed);
    expect(
      judgeAccountCompatibility(passingInput({ v4EmailVerified: true, v5Verified: false }))
    ).toEqual({
      ok: false,
      class: 'verified_mismatch',
      group: 'signIn',
      exampleId: 'account1',
      message: 'verified',
    });
  });

  it('A missing legacy_id_map row for a written playlist is public_id.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [{ id: 'playlis', isPublic: true, episodeIds: [], mediaRefIds: [] }],
          playlistIdTexts: ['playlis'],
        })
      )
    ).toEqual({
      ok: false,
      class: 'public_id',
      group: 'publicId',
      exampleId: 'playlis',
      message: 'playlist',
    });
  });
});

describe('judgePublicPath', () => {
  it('Public-path status 200 passes. Status 404 is public_path. A redirect whose path contains the id passes. A redirect to /profiles is public_path.', () => {
    const id = 'abc1234';
    const requestedPath = `/playlist/${id}`;
    expect(judgePublicPath({ id, requestedPath, status: 200, location: null })).toEqual({
      ok: true,
    });
    expect(judgePublicPath({ id, requestedPath, status: 404, location: null })).toEqual({
      ok: false,
      class: 'public_path',
      group: 'publicId',
      exampleId: id,
      message: `${requestedPath} 404`,
    });
    expect(
      judgePublicPath({
        id,
        requestedPath,
        status: 302,
        location: `https://web.example/go/${id}`,
      })
    ).toEqual({ ok: true });
    expect(
      judgePublicPath({
        id,
        requestedPath,
        status: 302,
        location: requestedPath,
      })
    ).toEqual({ ok: true });
    expect(
      judgePublicPath({
        id,
        requestedPath,
        status: 302,
        location: 'https://web.example/profiles',
      })
    ).toEqual({
      ok: false,
      class: 'public_path',
      group: 'publicId',
      exampleId: id,
      message: `${requestedPath} 302`,
    });
  });

  it('Public samples are the first three public written playlists and clips sorted by id, and do not include a profile path.', () => {
    expect(
      selectPublicSamplePaths(
        passingInput({
          playlists: [
            { id: 'plddddd', isPublic: true, episodeIds: [], mediaRefIds: [] },
            { id: 'plbbbbb', isPublic: true, episodeIds: [], mediaRefIds: [] },
            { id: 'plaaaaa', isPublic: true, episodeIds: [], mediaRefIds: [] },
            { id: 'plccccc', isPublic: true, episodeIds: [], mediaRefIds: [] },
            { id: 'pleeeee', isPublic: true, episodeIds: [], mediaRefIds: [] },
            { id: 'plfffff', isPublic: false, episodeIds: [], mediaRefIds: [] },
            { id: 'plggggg', isPublic: true, episodeIds: [], mediaRefIds: [] },
          ],
          playlistIdTexts: ['plddddd', 'plbbbbb', 'plaaaaa', 'plccccc', 'pleeeee', 'plfffff'],
          mediaRefs: [
            { id: 'clddddd', official: false, owned: true, isPublic: true },
            { id: 'clbbbbb', official: false, owned: true, isPublic: true },
            { id: 'claaaaa', official: false, owned: true, isPublic: true },
            { id: 'clccccc', official: false, owned: true, isPublic: true },
            { id: 'cleeeee', official: false, owned: true, isPublic: true },
            { id: 'cloffcl', official: true, owned: true, isPublic: true },
            { id: 'clprivt', official: false, owned: true, isPublic: false },
          ],
          clipIdTexts: [
            'clddddd',
            'clbbbbb',
            'claaaaa',
            'clccccc',
            'cleeeee',
            'cloffcl',
            'clprivt',
          ],
        })
      )
    ).toEqual([
      '/playlist/plaaaaa',
      '/playlist/plbbbbb',
      '/playlist/plccccc',
      '/clip/claaaaa',
      '/clip/clbbbbb',
      '/clip/clccccc',
    ]);
  });
});

describe('judgeAccountCompatibility membership', () => {
  it('A future paid expiry with Premium, one legacy_import grant, and a matching ends_at passes.', () => {
    const expiry = new Date('2027-01-01T00:00:00.000Z');
    expect(judgeAccountCompatibility(premiumInput(expiry, expiry))).toEqual({ ok: true });
    const within = new Date(expiry.getTime() + 1000);
    expect(judgeAccountCompatibility(premiumInput(expiry, within))).toEqual({ ok: true });
    expect(
      judgeAccountCompatibility(premiumInput(expiry, new Date(expiry.getTime() + 1001)))
    ).toMatchObject({
      ok: false,
      class: 'membership_mismatch',
      group: 'membership',
      message: 'ends_at',
    });
  });

  it('A future paid expiry outside the App Store window keeps the v4 expiry, and a window row past five UTC years matches the capped end.', () => {
    const expiry = new Date('9000-01-01T00:00:00.000Z');
    expect(
      judgeAccountCompatibility(premiumInput(expiry, expiry, { appStoreWindow: false }))
    ).toEqual({
      ok: true,
    });
    const startsAt = new Date('2026-11-12T05:08:14.500Z');
    const capped = new Date('2031-11-12T05:08:14.500Z');
    expect(
      judgeAccountCompatibility(
        premiumInput(expiry, capped, {
          now: startsAt,
          appStoreWindow: true,
          grants: [legacyGrant(startsAt, capped)],
        })
      )
    ).toEqual({ ok: true });
    const leapStart = new Date('2024-02-29T00:00:00.000Z');
    const leapCap = new Date('2029-03-01T00:00:00.000Z');
    expect(
      judgeAccountCompatibility(
        premiumInput(expiry, leapCap, {
          now: leapStart,
          appStoreWindow: true,
          grants: [legacyGrant(leapStart, leapCap)],
        })
      )
    ).toEqual({ ok: true });
    const inside = new Date('2027-01-01T00:00:00.000Z');
    expect(
      judgeAccountCompatibility(
        premiumInput(inside, inside, {
          now: startsAt,
          appStoreWindow: true,
          grants: [legacyGrant(startsAt, inside)],
        })
      )
    ).toEqual({ ok: true });
  });

  it('A carried trial with a trial grant passes.', () => {
    const trialEnd = new Date('2026-07-01T00:00:00.000Z');
    expect(
      judgeAccountCompatibility(
        passingInput({
          freeTrialExpiration: trialEnd,
          membershipExpiresAt: trialEnd,
          grants: [{ source: 'trial', startsAt: NOW, endsAt: trialEnd, revokedAt: null }],
        })
      )
    ).toEqual({ ok: true });
  });

  it('A past trial with no grant and tier Trial passes.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          freeTrialExpiration: new Date('2020-01-01T00:00:00.000Z'),
          accountMembershipId: AccountMembershipEnum.Trial,
        })
      )
    ).toEqual({ ok: true });
  });

  it('A past paid expiry with no grant and tier Trial passes, and an active legacy import grant is membership_mismatch.', () => {
    const expiry = new Date('2020-01-01T00:00:00.000Z');
    expect(judgeAccountCompatibility(passingInput({ membershipExpiration: expiry }))).toEqual({
      ok: true,
    });
    expect(
      judgeAccountCompatibility(
        passingInput({
          membershipExpiration: expiry,
          grants: [legacyGrant(NOW, expiry)],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'membership_mismatch',
      group: 'membership',
      message: 'legacy_import',
    });
  });

  it('A second grant source is membership_mismatch.', () => {
    const expiry = new Date('2027-01-01T00:00:00.000Z');
    expect(
      judgeAccountCompatibility(
        passingInput({
          membershipExpiration: expiry,
          accountMembershipId: AccountMembershipEnum.Premium,
          membershipExpiresAt: expiry,
          grants: [
            legacyGrant(NOW, expiry),
            { source: 'migration_baseline', startsAt: NOW, endsAt: expiry, revokedAt: null },
          ],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'membership_mismatch',
      group: 'membership',
      exampleId: 'account1',
      message: 'other_grant',
    });
  });

  it('A future paid expiry whose membership_expires_at is null is membership_mismatch.', () => {
    const expiry = new Date('2027-01-01T00:00:00.000Z');
    expect(
      judgeAccountCompatibility(premiumInput(expiry, expiry, { membershipExpiresAt: null }))
    ).toMatchObject({
      ok: false,
      class: 'membership_mismatch',
      message: 'membership_expires_at',
    });
  });
});

describe('judgeAccountCompatibility caps', () => {
  it('Add by RSS count 50 with a null column passes, and the feeds are written. Count 50 with a stored number below 50 is cap_tier. Count 50 with a stored number at or above 50 passes, and the feeds are written.', () => {
    expect(judgeAccountCompatibility(withFeeds(50, null, true))).toEqual({ ok: true });
    expect(judgeAccountCompatibility(withFeeds(50, 50, true))).toEqual({ ok: true });
    expect(judgeAccountCompatibility(withFeeds(50, 10001, true))).toEqual({ ok: true });
    const below = judgeAccountCompatibility(withFeeds(50, 49, true));
    expect(below).toMatchObject({
      ok: false,
      class: 'cap_tier',
      group: 'addByRss',
      exampleId: null,
    });
    expect(JSON.stringify(below)).not.toContain('feeds.example');
    const missing = judgeAccountCompatibility(withFeeds(50, null, false));
    expect(missing).toMatchObject({
      ok: false,
      class: 'unaccounted',
      group: 'addByRss',
      exampleId: null,
      message: 'addByRss 50 v4, 0 covered',
    });
    expect(JSON.stringify(missing)).not.toContain('feeds.example');
  });

  it('Two add-by-RSS urls that canonicalize to one feed count as one, and a blank entry does not count.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          addByRssUrls: ['https://FEEDS.example/a/', 'https://feeds.example/a', '  '],
          addByRssFeedUrls: ['https://feeds.example/a'],
        })
      )
    ).toEqual({ ok: true });
    expect(
      judgeAccountCompatibility(
        passingInput({
          addByRssUrls: ['https://FEEDS.example/a/', 'https://feeds.example/a', '  '],
        })
      )
    ).toEqual({
      ok: false,
      class: 'unaccounted',
      group: 'addByRss',
      exampleId: null,
      message: 'addByRss 1 v4, 0 covered',
    });
    expect(
      judgeAccountCompatibility(
        passingInput({
          addByRssUrls: [...feedUrls(100), '  ', ''],
          addByRssFeedUrls: feedUrls(100),
        })
      )
    ).toEqual({ ok: true });
  });

  it('Count 150 with column 200 passes, and every canonical URL is written. Count 150 with null, or with a number below 150, is cap_tier. Count 150 with a stored number at or above 150, including a number above 10000, passes.', () => {
    expect(judgeAccountCompatibility(withFeeds(150, 200, true))).toEqual({ ok: true });
    expect(judgeAccountCompatibility(withFeeds(150, 150, true))).toEqual({ ok: true });
    expect(judgeAccountCompatibility(withFeeds(150, 10001, true))).toEqual({ ok: true });
    expect(judgeAccountCompatibility(withFeeds(150, null, true))).toMatchObject({
      ok: false,
      class: 'cap_tier',
      group: 'addByRss',
    });
    expect(judgeAccountCompatibility(withFeeds(150, 149, true))).toMatchObject({
      ok: false,
      class: 'cap_tier',
      group: 'addByRss',
    });
    expect(judgeAccountCompatibility(withFeeds(150, null, false))).toMatchObject({
      ok: false,
      class: 'unaccounted',
      group: 'addByRss',
    });
  });

  it('An Add by RSS count of 100 with a null column passes, and a count of 101 with a null column is cap_tier. A count of 10000 with a null column is cap_tier.', () => {
    expect(judgeAccountCompatibility(withFeeds(100, null, true))).toEqual({ ok: true });
    expect(judgeAccountCompatibility(withFeeds(101, null, true))).toMatchObject({
      ok: false,
      class: 'cap_tier',
      group: 'addByRss',
    });
    expect(judgeAccountCompatibility(withFeeds(10000, null, true))).toMatchObject({
      ok: false,
      class: 'cap_tier',
      group: 'addByRss',
    });
  });

  it('Count 10001 whose column does not cover 10001, and which has no feed rows, is needs_operator. The same count with one feed row is cap_cut. Count 10001 with a stored number at or above 10001 and every canonical URL written passes.', () => {
    const uncovered = judgeAccountCompatibility(withFeeds(10001, null, false));
    expect(uncovered).toMatchObject({
      ok: false,
      class: 'needs_operator',
      group: 'addByRss',
      exampleId: null,
    });
    expect(JSON.stringify(uncovered)).not.toContain('feeds.example');
    expect(judgeAccountCompatibility(withFeeds(10001, 10000, false))).toMatchObject({
      ok: false,
      class: 'needs_operator',
      group: 'addByRss',
    });
    const urls = feedUrls(10001);
    expect(
      judgeAccountCompatibility(
        passingInput({
          addByRssUrls: urls,
          addByRssFeedUrls: ['https://feeds.example/0'],
          maxAddByRssFeeds: null,
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'cap_cut',
      group: 'addByRss',
      exampleId: null,
    });
    expect(judgeAccountCompatibility(withFeeds(10001, 10001, true))).toEqual({ ok: true });
    expect(judgeAccountCompatibility(withFeeds(10001, 20000, true))).toEqual({ ok: true });
    const partial = [...urls];
    partial.pop();
    expect(
      judgeAccountCompatibility(
        passingInput({
          addByRssUrls: urls,
          addByRssFeedUrls: partial,
          maxAddByRssFeeds: 10001,
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'unaccounted',
      group: 'addByRss',
      exampleId: null,
    });
  });

  it('A playlist with 10000 join members is copied. One with 10001 join members and no playlist row is needs_operator. The same playlist with a row is cap_cut.', () => {
    const copiedIds = numbered('e', 10000);
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [{ id: 'playlis', isPublic: false, episodeIds: copiedIds, mediaRefIds: [] }],
          playlistIdTexts: ['playlis'],
          playlistResources: [{ playlistIdText: 'playlis', memberIdTexts: copiedIds }],
          legacyMap: [userMap('account1'), playlistMap('playlis')],
        })
      )
    ).toEqual({ ok: true });
    const overIds = numbered('e', 10001);
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [{ id: 'playlis', isPublic: false, episodeIds: overIds, mediaRefIds: [] }],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'needs_operator',
      group: 'playlists',
      exampleId: 'playlis',
    });
    expect(
      judgeAccountCompatibility(
        passingInput({
          playlists: [{ id: 'playlis', isPublic: false, episodeIds: overIds, mediaRefIds: [] }],
          playlistIdTexts: ['playlis'],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'cap_cut',
      group: 'playlists',
      exampleId: 'playlis',
    });
  });

  it('Directory follows over 10000 with no follow rows is needs_operator. The same count with one follow row is cap_cut. There is no directory-follow column to read.', () => {
    expect(
      judgeAccountCompatibility(passingInput({ subscribedPodcastIds: numbered('p', 10000) }))
    ).toMatchObject({
      ok: false,
      class: 'unaccounted',
      group: 'subscriptions',
      exampleId: numbered('p', 1)[0],
    });
    const over = numbered('p', 10001);
    expect(judgeAccountCompatibility(passingInput({ subscribedPodcastIds: over }))).toMatchObject({
      ok: false,
      class: 'needs_operator',
      group: 'directoryFollows',
      exampleId: null,
    });
    expect(
      judgeAccountCompatibility(
        passingInput({
          subscribedPodcastIds: over,
          followedChannelIdTexts: [over[0] ?? 'p000000'],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'cap_cut',
      group: 'directoryFollows',
    });
    const shared = numbered('s', 5001);
    expect(
      judgeAccountCompatibility(
        passingInput({
          subscribedPodcastIds: shared,
          subscribedPlaylistIds: shared,
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'needs_operator',
      group: 'directoryFollows',
    });
    expect(
      judgeAccountCompatibility(
        passingInput({
          subscribedPodcastIds: numbered('p', 10000),
          subscribedUserIds: ['account1'],
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'needs_operator',
      group: 'directoryFollows',
    });
  });

  it('When Add by RSS and directory follows both need an operator, Add by RSS is returned.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          addByRssUrls: feedUrls(10001),
          subscribedPodcastIds: numbered('p', 10001),
        })
      )
    ).toMatchObject({
      ok: false,
      class: 'needs_operator',
      group: 'addByRss',
    });
  });

  it('clip_dropped is returned before needs_operator when both are true.', () => {
    expect(
      judgeAccountCompatibility(
        passingInput({
          mediaRefs: [{ id: 'clipusr', official: false, owned: true, isPublic: false }],
          pendingRows: [{ rowKind: 'snapshot_clip', legacyId: 'clipusr', status: 'dropped' }],
          addByRssUrls: feedUrls(10001),
        })
      )
    ).toMatchObject({ ok: false, class: 'clip_dropped' });
  });
});

describe('verify account sql', () => {
  it('The account load selects ids, flags, hashes, and expiries and does not select an email, a name, a title, or a pending context.', () => {
    const sql = [...Object.values(V4_VERIFY_SQL), ...Object.values(V5_VERIFY_SQL)].join('\n');
    expect(sql).toContain('password');
    expect(sql).toContain('"emailVerified"');
    expect(sql).toContain('"membershipExpiration"');
    expect(sql).toContain('"freeTrialExpiration"');
    expect(sql).toContain('1703635200000');
    expect(sql).toContain('1706745600000');
    expect(sql).toContain('max_add_by_rss_feeds');
    expect(sql).toContain("AT TIME ZONE 'UTC'");
    expect(sql).not.toMatch(/\bemail\b/i);
    expect(sql).not.toMatch(/\btitle\b/i);
    expect(sql).not.toMatch(/\bdescription\b/i);
    expect(sql).not.toMatch(/\bcontext\b/i);
    expect(sql).not.toMatch(/\bitemsOrder\b/);
    expect(sql).not.toMatch(/\bINSERT\b/i);
    expect(sql).not.toMatch(/\bUPDATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\b/i);
  });
});
