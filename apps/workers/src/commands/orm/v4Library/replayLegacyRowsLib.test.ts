import { describe, expect, it } from 'vitest';

import type { EpisodeDecision } from './copyAccountLibraryLib.js';
import type { ReplayCounts } from './replayLegacyRowsLib.js';
import {
  contextNumber,
  contextText,
  decideFollow,
  decidePlayback,
  decidePlaylistClip,
  decideSnapshotReattach,
  decideWaitingSnapshot,
  isReplayRowKind,
  REPLAY_ROW_KINDS,
  replayedPlaybackWins,
  resultFor,
  tallyReplay,
  zoneOfListPosition,
} from './replayLegacyRowsLib.js';

const ALL_DECISIONS: readonly EpisodeDecision[] = ['resolved', 'waiting', 'archive', 'gone'];

describe('replay row kinds', () => {
  it('leaves subscriptions out of the replay', () => {
    expect(isReplayRowKind('subscription')).toBe(false);
    expect(isReplayRowKind('follow_account')).toBe(true);
  });

  it('writes a clip before a playlist member that points at it', () => {
    expect(REPLAY_ROW_KINDS.indexOf('snapshot_clip')).toBeLessThan(
      REPLAY_ROW_KINDS.indexOf('snapshot_playlist_member')
    );
    expect(REPLAY_ROW_KINDS.indexOf('snapshot_clip')).toBeLessThan(
      REPLAY_ROW_KINDS.indexOf('playlist_clip')
    );
  });
});

describe('decideFollow', () => {
  it('writes the follow once the followed account is copied', () => {
    expect(decideFollow({ followedExists: true, isSelf: false })).toEqual({
      action: 'write',
      reason: 'replayed',
    });
  });

  it('keeps waiting while the followed account is not copied', () => {
    expect(decideFollow({ followedExists: false, isSelf: false })).toEqual({
      action: 'keep',
      reason: 'account_not_copied',
    });
  });

  it('resolves a self follow without writing it', () => {
    expect(decideFollow({ followedExists: true, isSelf: true }).action).toBe('resolve');
  });
});

describe('decidePlaylistClip', () => {
  it('appends the clip once the owner is copied', () => {
    expect(
      decidePlaylistClip({ playlistExists: true, clipExists: true, alreadyMember: false }).action
    ).toBe('write');
  });

  it('keeps waiting while the clip owner is not copied', () => {
    expect(
      decidePlaylistClip({ playlistExists: true, clipExists: false, alreadyMember: false }).action
    ).toBe('keep');
  });

  it('resolves when the clip is already in the playlist or the playlist is gone', () => {
    expect(
      decidePlaylistClip({ playlistExists: true, clipExists: true, alreadyMember: true }).reason
    ).toBe('already_in_playlist');
    expect(
      decidePlaylistClip({ playlistExists: false, clipExists: true, alreadyMember: false }).reason
    ).toBe('playlist_removed');
  });

  it('never drops a playlist clip', () => {
    for (const playlistExists of [true, false]) {
      for (const clipExists of [true, false]) {
        for (const alreadyMember of [true, false]) {
          expect(decidePlaylistClip({ playlistExists, clipExists, alreadyMember }).action).not.toBe(
            'drop'
          );
        }
      }
    }
  });
});

describe('decidePlayback', () => {
  it('writes the row when the item is Active', () => {
    expect(decidePlayback({ active: true }).action).toBe('write');
  });

  it('keeps waiting while the feed is not settled', () => {
    expect(
      decidePlayback({ active: false, status: 'unresolved', reason: 'waiting_parse' })
    ).toEqual({
      action: 'keep',
      reason: 'waiting_parse',
    });
    expect(
      decidePlayback({ active: false, status: 'unresolved', reason: 'item_not_active' }).action
    ).toBe('keep');
  });

  it('drops once the feed is settled and the item is still missing', () => {
    expect(decidePlayback({ active: false, status: 'dropped', reason: 'no_item' })).toEqual({
      action: 'drop',
      reason: 'no_item',
    });
  });
});

describe('snapshot decisions', () => {
  it('reattaches a snapshot when the episode matches or can be archived', () => {
    expect(decideSnapshotReattach('resolved')).toBe('attach');
    expect(decideSnapshotReattach('archive')).toBe('archive');
    expect(decideSnapshotReattach('waiting')).toBe('keep');
    expect(decideSnapshotReattach('gone')).toBe('keep');
  });

  it('writes a waiting clip or member once its feed parse finished or failed', () => {
    expect(decideWaitingSnapshot('waiting')).toBe('keep');
    expect(decideWaitingSnapshot('resolved')).toBe('write');
    expect(decideWaitingSnapshot('archive')).toBe('write');
    expect(decideWaitingSnapshot('gone')).toBe('write');
  });

  it('never drops a clip or playlist member', () => {
    for (const decision of ALL_DECISIONS) {
      expect(['attach', 'archive', 'keep']).toContain(decideSnapshotReattach(decision));
      expect(['write', 'keep']).toContain(decideWaitingSnapshot(decision));
    }
  });
});

describe('replayedPlaybackWins', () => {
  it('lets now playing outrank the queue and the queue outrank history', () => {
    expect(
      replayedPlaybackWins({ zone: 'now', playedAt: null }, { zone: 'upcoming', playedAt: null })
    ).toBe(true);
    expect(
      replayedPlaybackWins(
        { zone: 'upcoming', playedAt: null },
        { zone: 'history', playedAt: null }
      )
    ).toBe(true);
    expect(
      replayedPlaybackWins(
        { zone: 'history', playedAt: null },
        { zone: 'upcoming', playedAt: null }
      )
    ).toBe(false);
  });

  it('keeps the newer of two history rows', () => {
    const older = '2024-01-01T00:00:00.000Z';
    const newer = '2024-06-01T00:00:00.000Z';
    expect(
      replayedPlaybackWins(
        { zone: 'history', playedAt: newer },
        { zone: 'history', playedAt: older }
      )
    ).toBe(true);
    expect(
      replayedPlaybackWins(
        { zone: 'history', playedAt: older },
        { zone: 'history', playedAt: newer }
      )
    ).toBe(false);
  });

  it('keeps the existing row when both are in the queue', () => {
    expect(
      replayedPlaybackWins(
        { zone: 'upcoming', playedAt: null },
        { zone: 'upcoming', playedAt: null }
      )
    ).toBe(false);
  });
});

describe('helpers', () => {
  it('reads list positions as zones', () => {
    expect(zoneOfListPosition('0')).toBe('now');
    expect(zoneOfListPosition('1.00000002')).toBe('upcoming');
    expect(zoneOfListPosition('-0.99999999')).toBe('history');
  });

  it('reads text and numbers from a recorded context', () => {
    const context = {
      playlist_id: ' abc1234 ',
      list_position: '1.00000000',
      playback_position: 42,
      blank: '',
    };
    expect(contextText(context, 'playlist_id')).toBe('abc1234');
    expect(contextText(context, 'blank')).toBeNull();
    expect(contextNumber(context, 'playback_position')).toBe(42);
    expect(contextNumber(context, 'list_position')).toBeNull();
  });

  it('keeps the current status when a row waits', () => {
    expect(resultFor({ action: 'keep', reason: 'snapshot' }, 'resolved')).toEqual({
      status: 'resolved',
      reason: 'snapshot',
      outcome: 'kept',
    });
    expect(resultFor({ action: 'drop', reason: 'no_item' }, 'unresolved').status).toBe('dropped');
  });

  it('counts outcomes per kind', () => {
    const counts: ReplayCounts = {};
    tallyReplay(counts, 'history', 'written');
    tallyReplay(counts, 'history', 'written');
    tallyReplay(counts, 'history', 'dropped');
    expect(counts).toEqual({ history: { written: 2, dropped: 1 } });
  });
});
