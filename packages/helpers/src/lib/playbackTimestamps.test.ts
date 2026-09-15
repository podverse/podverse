import { describe, expect, it } from 'vitest';

import {
  applyClockOffset,
  clampClientPlaybackTimestamp,
  computeClockOffsetMs,
  mergePlaybackState,
  PLAYBACK_CLOCK_SKEW_ALLOWANCE_MS,
  resolveHandoffDecision,
} from './playbackTimestamps.js';

describe('clampClientPlaybackTimestamp', () => {
  const receivedAtIso = '2026-09-13T12:00:00.000Z';

  it('clamps an implausibly future client timestamp to receipt time', () => {
    const tenMinutesFutureIso = '2026-09-13T12:10:00.000Z';
    expect(clampClientPlaybackTimestamp(tenMinutesFutureIso, receivedAtIso)).toBe(receivedAtIso);
  });

  it('keeps a client timestamp in the past', () => {
    const tenMinutesPastIso = '2026-09-13T11:50:00.000Z';
    expect(clampClientPlaybackTimestamp(tenMinutesPastIso, receivedAtIso)).toBe(tenMinutesPastIso);
  });

  it('falls back to receipt time when the client timestamp is missing or unparseable', () => {
    expect(clampClientPlaybackTimestamp(undefined, receivedAtIso)).toBe(receivedAtIso);
    expect(clampClientPlaybackTimestamp('not a date', receivedAtIso)).toBe(receivedAtIso);
  });

  it('allows a small amount of positive skew within the configured window', () => {
    const nearFutureIso = new Date(
      Date.parse(receivedAtIso) + PLAYBACK_CLOCK_SKEW_ALLOWANCE_MS - 1000
    ).toISOString();
    expect(clampClientPlaybackTimestamp(nearFutureIso, receivedAtIso)).toBe(nearFutureIso);
  });
});

describe('mergePlaybackState', () => {
  it('lets the newer timestamp decide the result zone', () => {
    const result = mergePlaybackState(
      {
        completed: false,
        lastPlayedAt: '2026-09-13T10:00:00.000Z',
        playbackPosition: 10,
        zone: 'upcoming',
      },
      {
        completed: false,
        lastPlayedAt: '2026-09-13T11:00:00.000Z',
        playbackPosition: 20,
        zone: 'history',
      }
    );

    expect(result.zone).toBe('history');
    expect(result.lastPlayedAt).toBe('2026-09-13T11:00:00.000Z');
  });

  it('moves position forward even when the newer side reports a lower position', () => {
    const result = mergePlaybackState(
      {
        completed: false,
        lastPlayedAt: '2026-09-13T10:00:00.000Z',
        playbackPosition: 180,
        zone: 'history',
      },
      {
        completed: false,
        lastPlayedAt: '2026-09-13T11:00:00.000Z',
        playbackPosition: 42,
        zone: 'now_playing',
      }
    );

    expect(result.zone).toBe('now_playing');
    expect(result.playbackPosition).toBe(180);
  });

  it('keeps completion sticky when a stale incomplete state is merged', () => {
    const result = mergePlaybackState(
      {
        completed: true,
        lastPlayedAt: '2026-09-13T11:00:00.000Z',
        playbackPosition: 300,
        zone: 'history',
      },
      {
        completed: false,
        lastPlayedAt: '2026-09-13T10:00:00.000Z',
        playbackPosition: 120,
        zone: 'now_playing',
      }
    );

    expect(result.completed).toBe(true);
  });

  it('lets a non-null timestamp beat null in either argument order', () => {
    const withTimestamp = {
      completed: false,
      lastPlayedAt: '2026-09-13T11:00:00.000Z',
      playbackPosition: 90,
      zone: 'history' as const,
    };
    const withoutTimestamp = {
      completed: false,
      lastPlayedAt: null,
      playbackPosition: 95,
      zone: 'now_playing' as const,
    };

    expect(mergePlaybackState(withTimestamp, withoutTimestamp).zone).toBe('history');
    expect(mergePlaybackState(withoutTimestamp, withTimestamp).zone).toBe('history');
  });
});

describe('clock offset helpers', () => {
  it('returns a negative offset for a clock running three hours slow, and correction moves it forward', () => {
    const serverNowIso = '2026-09-13T10:00:00.000Z';
    const deviceNowMs = Date.parse('2026-09-13T07:00:00.000Z');

    const offsetMs = computeClockOffsetMs(serverNowIso, deviceNowMs);
    expect(offsetMs).toBe(-(3 * 60 * 60 * 1000));

    const deviceRecordedMs = Date.parse('2026-09-13T07:30:00.000Z');
    const correctedMs = applyClockOffset(deviceRecordedMs, offsetMs ?? 0);

    expect(new Date(correctedMs).toISOString()).toBe('2026-09-13T10:30:00.000Z');
  });
});

describe('resolveHandoffDecision', () => {
  const localItemIdText = 'episode-local';
  const serverItemIdText = 'episode-server';
  const localOlderAt = '2026-09-13T06:00:00.000Z';
  const localNewerAt = '2026-09-13T08:00:00.000Z';
  const serverNewerAt = '2026-09-13T07:00:00.000Z';
  const serverOlderAt = '2026-09-13T05:00:00.000Z';

  it('returns adopt_position when both sides point at the same item', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText,
        localLastPlayedAt: localOlderAt,
        serverItemIdText: localItemIdText,
        serverLastPlayedAt: serverNewerAt,
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'adopt_position' });
  });

  it('returns prompt when the item differs and the server is newer', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText,
        localLastPlayedAt: localOlderAt,
        serverItemIdText,
        serverLastPlayedAt: serverNewerAt,
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'prompt', serverItemIdText });
  });

  it('returns none when the item differs and local is newer', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText,
        localLastPlayedAt: localNewerAt,
        serverItemIdText,
        serverLastPlayedAt: serverOlderAt,
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'none' });
  });

  it('returns none when both sides differ but server timestamp is missing', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText,
        localLastPlayedAt: localOlderAt,
        serverItemIdText,
        serverLastPlayedAt: null,
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'none' });
  });

  it('treats missing local timestamp as older and prompts for a newer server state', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText,
        localLastPlayedAt: null,
        serverItemIdText,
        serverLastPlayedAt: serverNewerAt,
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'prompt', serverItemIdText });
  });

  it('accepts epoch millisecond inputs for timestamps', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText,
        localLastPlayedAt: Date.parse(localOlderAt),
        serverItemIdText,
        serverLastPlayedAt: Date.parse(serverNewerAt),
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'prompt', serverItemIdText });
  });

  it('short-circuits to none while local playback is active', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText,
        localLastPlayedAt: localOlderAt,
        serverItemIdText,
        serverLastPlayedAt: serverNewerAt,
        isPlayingLocally: true,
      })
    ).toEqual({ kind: 'none' });
  });

  it('handles reversed argument order consistently (local newer then server newer)', () => {
    expect(
      resolveHandoffDecision({
        localItemIdText: serverItemIdText,
        localLastPlayedAt: serverNewerAt,
        serverItemIdText: localItemIdText,
        serverLastPlayedAt: localOlderAt,
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'none' });

    expect(
      resolveHandoffDecision({
        localItemIdText: serverItemIdText,
        localLastPlayedAt: serverOlderAt,
        serverItemIdText: localItemIdText,
        serverLastPlayedAt: localNewerAt,
        isPlayingLocally: false,
      })
    ).toEqual({ kind: 'prompt', serverItemIdText: localItemIdText });
  });
});
