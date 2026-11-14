import { describe, expect, it } from 'vitest';

import {
  classifyLibraryResult,
  membershipOutcomes,
  rehearsalPasswordFromEnv,
  replayPassFinished,
  sweepIdentity,
  thrownErrorClass,
  webOriginForStage,
} from './rehearsalPhaseOutcome.js';

const emptyCount = {
  total: 0,
  resolved: 0,
  unresolved: 0,
  archivedItem: 0,
  snapshot: 0,
  notSeeded: 0,
  dropped: 0,
  pending: 0,
};

const emptyReport = {
  subscriptions: emptyCount,
  addByRss: emptyCount,
  followsPlaylist: emptyCount,
  followsUser: emptyCount,
  playlists: emptyCount,
  playlistMembers: emptyCount,
  playlistOrderDropped: 0,
  clips: emptyCount,
  clipsOfficialSkipped: 0,
  queue: emptyCount,
  history: emptyCount,
  nowPlaying: emptyCount,
};

const emptyAddByRssCap = { count: 0, action: 'copy' as const, writeTier: null };
const emptyDirectoryFollowCap = {
  count: 0,
  action: 'copy' as const,
  decision: { outcome: 'default' as const },
};

describe('classifyLibraryResult', () => {
  it('marks a closed apply done and an unclosed apply as library_not_closed.', () => {
    expect(
      classifyApply({
        groupErrors: [],
        needsOperatorGroups: [],
        libraryCopiedAtSet: true,
      })
    ).toEqual({ status: 'done', className: null, errors: [] });
    expect(
      classifyApply({
        groupErrors: [],
        needsOperatorGroups: [],
        libraryCopiedAtSet: false,
      })
    ).toEqual({
      status: 'failed',
      className: 'library_not_closed',
      errors: [{ group: null, className: 'library_not_closed', message: 'library not closed' }],
    });
  });

  it('marks an already copied library done and a missing v5 account as missing_v5_account.', () => {
    expect(classifyLibraryResult({ action: 'skip_already_copied', v4Id: 'abcdefg' })).toEqual({
      status: 'done',
      className: null,
      errors: [],
    });
    expect(classifyLibraryResult({ action: 'skip_missing_account', v4Id: 'abcdefg' })).toEqual({
      status: 'failed',
      className: 'missing_v5_account',
      errors: [{ group: null, className: 'missing_v5_account', message: 'no v5 account' }],
    });
  });

  it('fails a group error as copy refused and keeps that failure when a group is left for an operator.', () => {
    const refused = classifyApply({
      groupErrors: [{ group: 'playlists', class: 'db_constraint:playlist_resource_pkey' }],
      needsOperatorGroups: [],
      libraryCopiedAtSet: true,
    });
    expect(refused).toEqual({
      status: 'failed',
      className: 'db_constraint:playlist_resource_pkey',
      errors: [
        {
          group: 'playlists',
          className: 'db_constraint:playlist_resource_pkey',
          message: 'copy refused',
        },
      ],
    });

    const withOperator = classifyApply({
      groupErrors: [{ group: 'playlists', class: 'db_constraint:playlist_resource_pkey' }],
      needsOperatorGroups: ['add_by_rss'],
      libraryCopiedAtSet: true,
    });
    expect(withOperator.status).toBe('failed');
    expect(withOperator.className).toBe('db_constraint:playlist_resource_pkey');
    expect(withOperator.errors).toEqual([
      {
        group: 'playlists',
        className: 'db_constraint:playlist_resource_pkey',
        message: 'copy refused',
      },
      { group: 'add_by_rss', className: 'needs_operator', message: 'left for operator' },
    ]);
  });

  it('marks needsOperatorGroups with no group error as needs_operator.', () => {
    expect(
      classifyApply({
        groupErrors: [],
        needsOperatorGroups: ['add_by_rss'],
        libraryCopiedAtSet: true,
      })
    ).toEqual({
      status: 'needs_operator',
      className: 'needs_operator',
      errors: [{ group: 'add_by_rss', className: 'needs_operator', message: 'left for operator' }],
    });
  });

  it('fails help and dry_run as unexpected:dry_run.', () => {
    const failed = {
      status: 'failed',
      className: 'unexpected:dry_run',
      errors: [{ group: null, className: 'unexpected:dry_run', message: 'unexpected:dry_run' }],
    };
    expect(classifyLibraryResult({ action: 'help' })).toEqual(failed);
    expect(
      classifyLibraryResult({
        action: 'dry_run',
        v4Id: 'abcdefg',
        report: emptyReport,
        addByRssCap: emptyAddByRssCap,
        directoryFollowCap: emptyDirectoryFollowCap,
        playlistsOverLimit: [],
      })
    ).toEqual(failed);
  });
});

describe('replayPassFinished', () => {
  it('is true when the later count is equal or higher, and false when it fell.', () => {
    expect(replayPassFinished(5, 5)).toBe(true);
    expect(replayPassFinished(5, 6)).toBe(true);
    expect(replayPassFinished(5, 4)).toBe(false);
  });
});

describe('membershipOutcomes', () => {
  it('fails ids named by the rebuild lists and leaves an id in none of those lists done.', () => {
    expect(
      membershipOutcomes({
        requestedIds: ['missing1', 'ambig001', 'bademail', 'badexpir', 'clean001'],
        missingIds: ['missing1'],
        ambiguousIds: ['ambig001'],
        invalidEmailIds: ['bademail'],
        invalidExpiryIds: ['badexpir'],
        futureIds: [],
        counts: { unmatched: 0, ambiguous: 0, invalid: 0 },
      })
    ).toEqual([
      { v4Id: 'missing1', status: 'failed', className: 'missing_v4_account' },
      { v4Id: 'ambig001', status: 'failed', className: 'ambiguous_email' },
      { v4Id: 'bademail', status: 'failed', className: 'invalid_email' },
      { v4Id: 'badexpir', status: 'failed', className: 'invalid_expiry' },
      { v4Id: 'clean001', status: 'done', className: null },
    ]);
  });

  it('fails future ids when one membership count equals that list and the other two are zero.', () => {
    expect(futureOutcome({ unmatched: 2, ambiguous: 0, invalid: 0 })).toEqual([
      { v4Id: 'future01', status: 'failed', className: 'membership_unmatched' },
      { v4Id: 'future02', status: 'failed', className: 'membership_unmatched' },
      { v4Id: 'kept0001', status: 'done', className: null },
    ]);
    expect(futureOutcome({ unmatched: 0, ambiguous: 2, invalid: 0 })).toEqual([
      { v4Id: 'future01', status: 'failed', className: 'membership_ambiguous' },
      { v4Id: 'future02', status: 'failed', className: 'membership_ambiguous' },
      { v4Id: 'kept0001', status: 'done', className: null },
    ]);
    expect(futureOutcome({ unmatched: 0, ambiguous: 0, invalid: 2 })).toEqual([
      { v4Id: 'future01', status: 'failed', className: 'membership_invalid' },
      { v4Id: 'future02', status: 'failed', className: 'membership_invalid' },
      { v4Id: 'kept0001', status: 'done', className: null },
    ]);
  });

  it('leaves future ids done when the counts are a partial list or a split across two counters.', () => {
    expect(futureOutcome({ unmatched: 1, ambiguous: 0, invalid: 0 })).toEqual([
      { v4Id: 'future01', status: 'done', className: null },
      { v4Id: 'future02', status: 'done', className: null },
      { v4Id: 'kept0001', status: 'done', className: null },
    ]);
    expect(futureOutcome({ unmatched: 1, ambiguous: 1, invalid: 0 })).toEqual([
      { v4Id: 'future01', status: 'done', className: null },
      { v4Id: 'future02', status: 'done', className: null },
      { v4Id: 'kept0001', status: 'done', className: null },
    ]);
  });
});

describe('webOriginForStage', () => {
  it('skips the public path sample for pilot and sample, and builds an http origin for full.', () => {
    expect(webOriginForStage('pilot', 'localhost:3002')).toEqual({
      samplePublicPaths: false,
      webOrigin: null,
    });
    expect(webOriginForStage('sample', 'localhost:3002')).toEqual({
      samplePublicPaths: false,
      webOrigin: null,
    });
    expect(webOriginForStage('full', 'localhost:3002')).toEqual({
      samplePublicPaths: true,
      webOrigin: 'http://localhost:3002',
    });
  });

  it('keeps an http or https origin and removes one trailing slash.', () => {
    expect(webOriginForStage('full', 'http://localhost:3002/')).toEqual({
      samplePublicPaths: true,
      webOrigin: 'http://localhost:3002',
    });
    expect(webOriginForStage('full', 'https://localhost:3002/')).toEqual({
      samplePublicPaths: true,
      webOrigin: 'https://localhost:3002',
    });
  });

  it('throws when the full stage has a blank domain or a domain that contains @.', () => {
    expect(() => webOriginForStage('full', '')).toThrow(
      'Missing web origin for the public path sample.'
    );
    expect(() => webOriginForStage('full', null)).toThrow(
      'Missing web origin for the public path sample.'
    );
    expect(() => webOriginForStage('full', 'person@localhost')).toThrow('invalid_web_origin');
  });
});

describe('thrownErrorClass', () => {
  it('uses the error name for an Error and unexpected:unknown for a thrown string.', () => {
    expect(thrownErrorClass(new TypeError('x'))).toBe('unexpected:TypeError');
    expect(thrownErrorClass('x')).toBe('unexpected:unknown');
  });

  it('uses unexpected:unknown when the error name is not a short identifier.', () => {
    const unnamed = new Error('x');
    unnamed.name = '1Type';
    expect(thrownErrorClass(unnamed)).toBe('unexpected:unknown');

    const tooLong = new Error('x');
    tooLong.name = `A${'b'.repeat(69)}`;
    expect(thrownErrorClass(tooLong)).toBe('unexpected:unknown');
  });
});

describe('rehearsalPasswordFromEnv', () => {
  it('returns null for a blank password and returns a non-empty trim unchanged.', () => {
    expect(rehearsalPasswordFromEnv(undefined)).toBeNull();
    expect(rehearsalPasswordFromEnv('  ')).toBeNull();
    expect(rehearsalPasswordFromEnv('  Secret  ')).toBe('Secret');
  });
});

describe('sweepIdentity', () => {
  it('is done when the account row exists and left_out when it does not.', () => {
    expect(sweepIdentity(true)).toBe('done');
    expect(sweepIdentity(false)).toBe('left_out');
  });
});

function classifyApply(input: {
  groupErrors: Array<{ group: 'playlists'; class: string }>;
  needsOperatorGroups: string[];
  libraryCopiedAtSet: boolean;
}) {
  return classifyLibraryResult({
    action: 'apply',
    v4Id: 'abcdefg',
    report: emptyReport,
    apply: {
      archivedItems: 0,
      clips: 0,
      playlistMembers: 0,
      playback: 0,
      pendingRows: 0,
      legacyIdsMapped: 0,
      groupErrors: input.groupErrors,
      needsOperatorGroups: input.needsOperatorGroups,
      libraryCopiedAtSet: input.libraryCopiedAtSet,
      addByRssCap: emptyAddByRssCap,
      directoryFollowCap: emptyDirectoryFollowCap,
      playlistsOverLimit: [],
    },
  });
}

function futureOutcome(counts: { unmatched: number; ambiguous: number; invalid: number }) {
  return membershipOutcomes({
    requestedIds: ['future01', 'future02', 'kept0001'],
    missingIds: [],
    ambiguousIds: [],
    invalidEmailIds: [],
    invalidExpiryIds: [],
    futureIds: ['future01', 'future02'],
    counts,
  });
}
