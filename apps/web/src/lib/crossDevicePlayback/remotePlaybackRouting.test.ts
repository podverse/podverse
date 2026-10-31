import { describe, expect, it } from 'vitest';

import type {
  AddByRSSResourceData,
  DTOPlaybackResourceRef,
  DTOPlaybackState,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import {
  resolveRemoteJumpTarget,
  resolveRemotePickCommand,
  shouldApplyExplicitPlayLocally,
} from './remotePlaybackRouting';

const itemRef: DTOPlaybackResourceRef = { kind: 'item', item_id_text: 'item-1' };

function state(overrides: Partial<DTOPlaybackState> = {}): DTOPlaybackState {
  return {
    revision: 1,
    active_session_id_text: 'session-other',
    resource: {
      ref: itemRef,
      medium: MediumEnum.Podcast,
      title: 'Episode',
      channel_title: 'Show',
      image_url: null,
    },
    status: 'playing',
    is_live: false,
    position_seconds: 10,
    duration_seconds: 600,
    rate: 1,
    updated_at_ms: 0,
    sent_at_ms: 0,
    ...overrides,
  };
}

describe('resolveRemotePickCommand', () => {
  it('pauses the same item when the playing device is playing and no start was asked for', () => {
    expect(
      resolveRemotePickCommand({
        pickedRef: itemRef,
        addByRSSResourceData: null,
        startSeconds: null,
        loadsPaused: false,
        remoteState: state({ status: 'playing' }),
      })
    ).toEqual({ type: 'pause' });
  });

  it('pauses the same item when the playing device is still loading', () => {
    expect(
      resolveRemotePickCommand({
        pickedRef: itemRef,
        addByRSSResourceData: null,
        startSeconds: null,
        loadsPaused: false,
        remoteState: state({ status: 'loading' }),
      })
    ).toEqual({ type: 'pause' });
  });

  it('plays the same item when the playing device is paused and no start was asked for', () => {
    expect(
      resolveRemotePickCommand({
        pickedRef: itemRef,
        addByRSSResourceData: null,
        startSeconds: null,
        loadsPaused: false,
        remoteState: state({ status: 'paused' }),
      })
    ).toEqual({ type: 'play' });
  });

  it('plays the same item from a requested start instead of toggling', () => {
    expect(
      resolveRemotePickCommand({
        pickedRef: itemRef,
        addByRSSResourceData: null,
        startSeconds: 15,
        loadsPaused: false,
        remoteState: state({ status: 'playing' }),
      })
    ).toEqual({
      type: 'play_item',
      resource: itemRef,
      add_by_rss_resource_data: null,
      start_seconds: 15,
    });
  });

  it('plays another item from its saved position', () => {
    const pickedRef: DTOPlaybackResourceRef = { kind: 'item', item_id_text: 'item-2' };
    expect(
      resolveRemotePickCommand({
        pickedRef,
        addByRSSResourceData: null,
        startSeconds: null,
        loadsPaused: false,
        remoteState: state(),
      })
    ).toEqual({
      type: 'play_item',
      resource: pickedRef,
      add_by_rss_resource_data: null,
      start_seconds: null,
    });
  });

  it('carries Add by RSS data on an Add by RSS pick', () => {
    const addByRSSResourceData: AddByRSSResourceData = {
      feed_url: 'https://feeds.example.com/show.xml',
      guid: 'ep-1',
      title: 'Add by RSS Episode',
    };
    const pickedRef: DTOPlaybackResourceRef = {
      kind: 'add_by_rss',
      add_by_rss_hash_id: 'hash-1',
    };
    expect(
      resolveRemotePickCommand({
        pickedRef,
        addByRSSResourceData,
        startSeconds: null,
        loadsPaused: false,
        remoteState: state(),
      })
    ).toEqual({
      type: 'play_item',
      resource: pickedRef,
      add_by_rss_resource_data: addByRSSResourceData,
      start_seconds: null,
    });
  });

  it('sends nothing when the pick would load paused', () => {
    expect(
      resolveRemotePickCommand({
        pickedRef: itemRef,
        addByRSSResourceData: null,
        startSeconds: null,
        loadsPaused: true,
        remoteState: state({ status: 'playing' }),
      })
    ).toBeNull();
  });
});

describe('resolveRemoteJumpTarget', () => {
  it('clamps a forward jump to the duration', () => {
    expect(
      resolveRemoteJumpTarget({
        remoteState: state({ duration_seconds: 110 }),
        estimatedPositionSeconds: 100,
        deltaSeconds: 30,
      })
    ).toBe(110);
  });

  it('clamps a backward jump to 0', () => {
    expect(
      resolveRemoteJumpTarget({
        remoteState: state({ duration_seconds: 600 }),
        estimatedPositionSeconds: 10,
        deltaSeconds: -30,
      })
    ).toBe(0);
  });

  it('does not apply an upper bound when the duration is unknown', () => {
    expect(
      resolveRemoteJumpTarget({
        remoteState: state({ duration_seconds: null }),
        estimatedPositionSeconds: 100,
        deltaSeconds: 30,
      })
    ).toBe(130);
  });

  it('returns null for a live item', () => {
    expect(
      resolveRemoteJumpTarget({
        remoteState: state({ is_live: true, position_seconds: null, duration_seconds: null }),
        estimatedPositionSeconds: 100,
        deltaSeconds: 30,
      })
    ).toBeNull();
  });

  it('returns null when there is no remote state', () => {
    expect(
      resolveRemoteJumpTarget({
        remoteState: null,
        estimatedPositionSeconds: 100,
        deltaSeconds: 30,
      })
    ).toBeNull();
  });
});

describe('shouldApplyExplicitPlayLocally', () => {
  const sameSession = {
    role: 'remote' as const,
    thisSessionIdText: 'session-this',
    activeSessionIdText: 'session-this',
    thisTabId: 'tab-this',
    audioTabId: null,
  };

  it('plays here when this session is active and no other tab has announced', () => {
    expect(shouldApplyExplicitPlayLocally(sameSession)).toBe(true);
  });

  it('commands the other tab once that tab has announced', () => {
    expect(shouldApplyExplicitPlayLocally({ ...sameSession, audioTabId: 'tab-other' })).toBe(
      false
    );
  });

  it('commands another session', () => {
    expect(
      shouldApplyExplicitPlayLocally({ ...sameSession, activeSessionIdText: 'session-other' })
    ).toBe(false);
  });
});
